import { expect, test } from '@oclif/test'
import { MailscriptApiServer } from './constants'

describe('sync', () => {
  describe('export', () => {
    describe('empty setup', () => {
      const nockExport = (api: any) => {
        return api
          .persist()
          .get('/addresses')
          .reply(200, {
            list: [],
          })
          .get('/accessories')
          .reply(200, { list: [] })
          .get('/automations')
          .reply(200, { list: [] })
      }

      test
        .stdout()
        .nock(MailscriptApiServer, nockExport)
        .command(['sync', 'export'])
        .exit(0)
        .it('gives skeleton yaml', (ctx) => {
          expect(ctx.stdout).to.contain(
            `
addresses: []
keys: []
accessories: []
automations: []`.trim(),
          )
        })
    })

    describe('simple setup', () => {
      const nockExport = (api: any) => {
        return api
          .persist()
          .get('/addresses')
          .reply(200, {
            list: [
              {
                id: 'smith@mailscript.io',
                owner: 'xyz',
                createdAt: '2020-12-01T10:19:02.656Z',
                createdBy: 'xyz',
              },
            ],
          })
          .get('/addresses/smith@mailscript.io/keys')
          .reply(200, {
            list: [
              {
                id: 'mivAW1KCbhZ4eGOW6D8X',
                read: true,
                createdAt: '2020-12-01T10:19:02.656Z',
                createdBy: 'xyz',
                write: true,
              },
            ],
          })
          .get('/accessories')
          .reply(200, {
            list: [
              {
                id: 'jaLhjOMQ7THh1ei9hoVZ',
                owner: 'xyz',
                address: 'smith@mailscript.io',
                type: 'mailscript-email',
                createdAt: '2020-12-01T10:19:02.656Z',
                createdBy: 'xyz',
                name: 'smith@mailscript.io',
                sms: null,
                key: 'mivAW1KCbhZ4eGOW6D8X',
              },
              {
                id: 'webhook-xyz',
                owner: 'xyz',
                type: 'webhook',
                createdAt: '2020-12-01T10:18:04.195Z',
                createdBy: 'xyz',
                name: 'webhook',
              },
            ],
          })
          .get('/automations')
          .reply(200, {
            list: [
              {
                id: 'zcYyhU2V9zKlLGTpBYnE',
                owner: 'xyz',
                trigger: {
                  accessoryId: 'jaLhjOMQ7THh1ei9hoVZ',
                  config: {
                    criterias: [
                      {
                        sentTo: 'smith@mailscript.io',
                      },
                    ],
                  },
                },
                createdAt: '2020-12-01T11:35:45.906Z',
                createdBy: 'xyz',
                actions: [
                  {
                    accessoryId: 'jaLhjOMQ7THh1ei9hoVZ',
                    config: {
                      forward: 'john@smith.me',
                      type: 'forward',
                    },
                  },
                ],
              },
            ],
          })
      }

      test
        .stdout()
        .nock(MailscriptApiServer, nockExport)
        .command(['sync', 'export'])
        .exit(0)
        .it('outputs yaml', (ctx) => {
          expect(ctx.stdout).to.contain(
            `
addresses:
  - smith@mailscript.io
keys:
  - address: smith@mailscript.io
    keys:
      - key: mivAW1KCbhZ4eGOW6D8X
        read: true
        write: true
accessories:
  - id: jaLhjOMQ7THh1ei9hoVZ
    address: smith@mailscript.io
    type: mailscript-email
    name: smith@mailscript.io
    key: mivAW1KCbhZ4eGOW6D8X
  - id: webhook-xyz
    type: webhook
    name: webhook
automations:
  - trigger:
      accessoryId: jaLhjOMQ7THh1ei9hoVZ
      config:
        criterias:
          - sentTo: smith@mailscript.io
    actions:
      - accessoryId: jaLhjOMQ7THh1ei9hoVZ
        config:
          forward: john@smith.me
          type: forward`.trim(),
          )
        })
    })
  })
})
