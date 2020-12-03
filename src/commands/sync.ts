/* eslint-disable no-await-in-loop */
import { Command, flags } from '@oclif/command'
import { handle } from 'oazapfts'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import cli from 'cli-ux'
import deepEqual from 'deep-equal'
import * as api from '../api'
import { assertNever } from '../utils/assertNever'
import setupApiClient from '../setupApiClient'
import withStandardErrors from '../utils/errorHandling'
import resolveAddAccessoryRequestFrom from '../utils/resolveAddAccessoryRequestFrom'
import resolveUpdateAccessoryRequestFrom from '../utils/resolveUpdateAccessoryRequestFrom'

type FlagsType = {
  help: void
  path: string | undefined
}

enum Subcommand {
  export = 'export',
  import = 'import',
  update = 'update',
}

export default class Sync extends Command {
  static description =
    'allows current setup to be exported, imported, or/and updated'

  static flags = {
    help: flags.help({ char: 'h' }),
    path: flags.string({
      char: 'p',
      description: 'path to the file to read/write',
    }),
  }

  static args = [
    {
      name: 'subcommand',
      required: true,
      default: Subcommand.export,
      options: Object.keys(Subcommand),
      parse: (input: string) => Subcommand[input as keyof typeof Subcommand],
    },
  ]

  async run() {
    const { args, flags } = this.parse(Sync)
    const client = await setupApiClient()
    const subcommand: Subcommand = args.subcommand

    switch (subcommand) {
      case Subcommand.update:
        return this.update()
      case Subcommand.export:
        return this.export(client, flags)
      case Subcommand.import:
        return this.import(client, flags)
      default:
        assertNever(subcommand)
    }
  }

  async update(): Promise<void> {
    this.log('TBD')
  }

  async import(client: typeof api, flags: FlagsType): Promise<void> {
    if (!flags.path) {
      this.log('Please provide a file to read from --path')
      this.exit(1)
    }

    const data: any = yaml.safeLoad(fs.readFileSync(flags.path, 'utf8'))

    if (!data) {
      this.log('Problem parsing yaml file')
      this.exit(1)
    }

    const { addresses = [], accessories = [], automations = [] } = data

    this.log('')
    this.log('Syncing to Mailscript')
    this.log('')

    await this._syncAddresses(client, addresses)
    await this._syncKeys(client, addresses)
    await this._syncAccessories(client, accessories)
    await this._syncAutomations(client, automations)
  }

  async export(client: typeof api, flags: FlagsType): Promise<void> {
    const addresses: Array<string> = (
      await handle(
        client.getAllAddresses(),
        withStandardErrors(
          { '200': ({ list }: api.GetAllAddressesResponse) => list },
          this,
        ),
      )
    ).map(({ id }: api.Address) => id)

    const keys = await Promise.all(
      addresses.map(async (address) => {
        const keys = (
          await handle(
            client.getAllKeys(address),
            withStandardErrors(
              { '200': ({ list }: api.GetAllKeysResponse) => list },
              this,
            ),
          )
        ).map(({ id, name, read, write }: api.Key) => ({
          id,
          name,
          read,
          write,
        }))
        return { address, keys }
      }),
    )

    const accessories = (
      await handle(
        client.getAllAccessories(),
        withStandardErrors(
          { '200': ({ list }: api.GetAllAccessoriesResponse) => list },
          this,
        ),
      )
    )
      .filter(({ type }: api.Accessory) => type !== 'webhook')
      .map(
        ({
          id,
          owner: _owner,
          createdAt: _createdAt,
          createdBy: _createdBy,
          name,
          type,
          ...rest
        }: api.Accessory) => ({
          id,
          name,
          type,
          ...rest,
          ...this._lookupKeyName(keys, rest.key),
        }),
      )

    const automations = (
      await handle(
        client.getAllAutomations(),
        withStandardErrors(
          { '200': ({ list }: api.GetAllAutomationsResponse) => list },
          this,
        ),
      )
    ).map(({ name, trigger, actions }: api.Automation) => ({
      name,
      trigger: this._mapAccessory(accessories, trigger),
      actions: actions.map((action: any) =>
        this._mapAccessory(accessories, action),
      ),
    }))

    const mergedAddressesAndKeys = Object.fromEntries(
      addresses.map((address) => {
        const keyEntry = keys.find((ke) => ke.address === address)

        if (!keyEntry) {
          return [address, {}]
        }

        return [
          address,
          {
            keys: keyEntry.keys.map(({ id: _id, ...rest }: any) => ({
              ...rest,
            })),
          },
        ]
      }),
    )

    const data = yaml.dump({
      version: '0.1',
      addresses: mergedAddressesAndKeys,
      accessories: accessories.map(({ id: _id, ...rest }: any) => rest),
      automations,
    })

    if (flags.path) {
      fs.writeFileSync(flags.path, data)
    } else {
      this.log(data)
    }

    this.exit(0)
  }

  private async _syncAddresses(client: typeof api, addresses: Array<any>) {
    cli.action.start('Syncing addresses')
    const response = await client.getAllAddresses()

    if (response.status !== 200) {
      this.log('Error syncing addresses')
      this.exit(1)
    }

    const {
      data: { list: existingAddresses },
    } = response

    // addresses
    for (const address of Object.keys(addresses)) {
      const existingAddress = existingAddresses.find((a) => a.id === address)

      if (existingAddress) {
        continue
      }

      // add address
      // eslint-disable-next-line no-await-in-loop
      await handle(client.addAddress({ address }), withStandardErrors({}, this))
    }

    cli.action.stop()
  }

  private async _syncKeys(client: typeof api, yamlAddresses: Array<any>) {
    cli.action.start('Syncing keys')

    for (const [address, { keys }] of Object.entries(yamlAddresses)) {
      // eslint-disable-next-line no-await-in-loop
      const existingKeysResponse = await client.getAllKeys(address)

      if (existingKeysResponse.status !== 200) {
        this.log('Error syncing keys')
        this.exit(1)
      }

      const {
        data: { list: existingKeys },
      } = existingKeysResponse

      for (const key of keys) {
        const existingKey = existingKeys.find((ek) => ek.name === key.name)

        // add if missing
        if (!existingKey) {
          await handle(
            client.addKey(address, {
              name: key.name,
              read: key.read,
              write: key.write,
            }),
            withStandardErrors({}, this),
          )

          continue
        }

        // update if different
        if (existingKey.read !== key.read || existingKey.write !== key.write) {
          this.log('Updating')

          await handle(
            client.updateKey(address, key.key, {
              read: key.read,
              write: key.write,
            }),
            withStandardErrors({}, this),
          )

          continue
        }
      }
    }

    cli.action.stop()
  }

  private async _syncAccessories(
    client: typeof api,
    yamlAccessories: Array<any>,
  ) {
    cli.action.start('Syncing accessories')

    const existingAccessoriesResponse = await client.getAllAccessories()

    if (existingAccessoriesResponse.status !== 200) {
      cli.action.stop('Error reading accessories')
      this.exit(1)
    }

    const {
      data: { list: existingAccessories },
    } = existingAccessoriesResponse

    for (const yamlAccessory of yamlAccessories) {
      if (yamlAccessory.type === 'webhook') {
        continue
      }

      const existingAccessory = existingAccessories.find(
        (ea) => ea.name === yamlAccessory.name,
      )

      // eslint-disable-next-line no-await-in-loop
      const accessory = await this._accessoryKeySubstitution(
        client,
        yamlAccessory,
      )

      if (!existingAccessory) {
        const addAccessoryRequest = resolveAddAccessoryRequestFrom(accessory)

        await handle(
          client.addAccessory(addAccessoryRequest),
          withStandardErrors({}, this),
        )

        continue
      }

      if (yamlAccessory.type === 'mailscript-email') {
        if (
          existingAccessory.type !== accessory.type ||
          existingAccessory.address !== accessory.address ||
          existingAccessory.key !== accessory.key
        ) {
          const updateAccessoryRequest = resolveUpdateAccessoryRequestFrom(
            accessory,
          )

          await handle(
            client.updateAccessory(accessory.id, updateAccessoryRequest),
            withStandardErrors({}, this),
          )
        }
      } else if (
        accessory.type === 'sms' &&
        (existingAccessory.type !== accessory.type ||
          existingAccessory.sms !== accessory.sms)
      ) {
        const updateAccessoryRequest = resolveUpdateAccessoryRequestFrom(
          accessory,
        )

        await handle(
          client.updateAccessory(accessory.id, updateAccessoryRequest),
          withStandardErrors({}, this),
        )
      }
    }

    cli.action.stop()
  }

  private async _syncAutomations(
    client: typeof api,
    yamlAutomations: Array<any>,
  ) {
    cli.action.start('Syncing automations')

    const existingAutomationsResponse = await client.getAllAutomations()

    if (existingAutomationsResponse.status !== 200) {
      this.log('Error reading automations')
      this.exit(1)
    }

    const {
      data: { list: existingAutomations },
    } = existingAutomationsResponse

    const { list: allAccessories } = await handle(
      client.getAllAccessories(),
      withStandardErrors({}, this),
    )

    for (const automation of yamlAutomations) {
      const existingAutomation = existingAutomations.find(
        (ea) => ea.name === automation.name,
      )

      const resolvedAutomation = this._substituteAccessoryIdAutomation(
        allAccessories,
        automation,
      )

      if (!existingAutomation) {
        await handle(
          client.addAutomation(resolvedAutomation),
          withStandardErrors({}, this),
        )

        continue
      }

      if (
        !deepEqual(existingAutomation.trigger, resolvedAutomation.trigger) ||
        !deepEqual(existingAutomation.actions, resolvedAutomation.actions)
      ) {
        await handle(
          client.updateAutomation(existingAutomation.id, resolvedAutomation),
          withStandardErrors({}, this),
        )
      }
    }

    cli.action.stop()
  }

  private _lookupKeyName(
    keys: {
      address: string
      keys: any
    }[],
    keyId: string,
  ): {} {
    if (!keyId) {
      return {}
    }

    const key = keys
      .map((ke) => ke.keys)
      .flat()
      .find((k: { id: string }) => k.id === keyId)

    if (!key) {
      return {}
    }

    return { key: key.name }
  }

  private _mapAccessory(
    accessories: Array<any>,
    { accessoryId, ...rest }: { accessoryId: string },
  ) {
    const accessory = accessories.find((acc) => acc.id === accessoryId)

    if (!accessory) {
      return {
        ...rest,
      }
    }

    return {
      accessory: accessory.name,
      ...rest,
    }
  }

  private async _accessoryKeySubstitution(
    client: typeof api,
    yamlAccessory: any,
  ) {
    if (yamlAccessory.type !== 'mailscript-email') {
      return yamlAccessory
    }

    // eslint-disable-next-line no-await-in-loop
    const { list: addressKeys } = await handle(
      client.getAllKeys(yamlAccessory.address!),
      withStandardErrors({}, this),
    )

    const addressKey = addressKeys.find(
      (ak: any) => ak.name === yamlAccessory.key,
    )

    if (!addressKey) {
      cli.action.stop(`Error reading address key: ${yamlAccessory.key}`)
      this.exit(1)
    }

    return {
      ...yamlAccessory,
      key: addressKey.id,
    }
  }

  private _substituteAccessoryIdAutomation(
    allAccessories: Array<any>,
    yamlAutomation: any,
  ) {
    return {
      ...yamlAutomation,
      trigger: this._substituteAccessoryIdFor(
        allAccessories,
        yamlAutomation.trigger,
      ),
      actions: yamlAutomation.actions.map((action: any) =>
        this._substituteAccessoryIdFor(allAccessories, action),
      ),
    }
  }

  private _substituteAccessoryIdFor(
    allAccessories: Array<any>,
    { accessory: name, ...rest }: any,
  ) {
    const accessory = allAccessories.find((a) => a.name === name)

    return {
      accessoryId: accessory.id,
      ...rest,
    }
  }
}
