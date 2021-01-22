import { expect, test } from '@oclif/test'
import { MailscriptApiServer } from './constants'

describe('Error handling', () => {
  test
    .stdout()
    .nock(MailscriptApiServer, (api) =>
      api.get('/addresses').reply(403, { error: 'No credentials sent!' }),
    )
    .command(['addresses:list'])
    .exit(1)
    .it('warns on no credentials', (ctx) => {
      expect(ctx.stdout).to.contain(
        'Error - authenticating: No credentials sent!',
      )
    })

  test
    .stdout()
    .nock(MailscriptApiServer, (api) =>
      api.get('/addresses').reply(400, { error: 'bad request boo!' }),
    )
    .command(['addresses:list'])
    .exit(1)
    .it('shows error for general bad request', (ctx) => {
      expect(ctx.stdout).to.contain('Error: bad request boo!')
    })

  test
    .stdout()
    .nock(MailscriptApiServer, (api) =>
      api.get('/addresses').reply(777, { aaa: 'bbb' }),
    )
    .command(['addresses:list'])
    .exit(1)
    .it('shows response and exits for unknown status code', (ctx) => {
      expect(ctx.stdout).to.contain('Unknown status code 777')
    })
})
