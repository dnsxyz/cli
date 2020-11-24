MailScript cli
==============

Configure and use mailscript from the command-line

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mailscriptcli.svg)](https://npmjs.org/package/mailscriptcli)
[![Downloads/week](https://img.shields.io/npm/dw/mailscriptcli.svg)](https://npmjs.org/package/mailscriptcli)
[![License](https://img.shields.io/npm/l/mailscriptcli.svg)](https://github.com/getmailscript/mailscriptcli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g mailscript
$ mailscript COMMAND
running command...
$ mailscript (-v|--version|version)
mailscript/0.2.0 darwin-x64 node-v14.15.0
$ mailscript --help [COMMAND]
USAGE
  $ mailscript COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mailscript accessories [FILE]`](#mailscript-accessories-file)
* [`mailscript addresses SUBCOMMAND`](#mailscript-addresses-subcommand)
* [`mailscript automations SUBCOMMAND`](#mailscript-automations-subcommand)
* [`mailscript help [COMMAND]`](#mailscript-help-command)
* [`mailscript login`](#mailscript-login)
* [`mailscript workspaces SUBCOMMAND`](#mailscript-workspaces-subcommand)

## `mailscript accessories [FILE]`

describe the command here

```
USAGE
  $ mailscript accessories [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/accessories.ts](https://github.com/getmailscript/cli/blob/v0.2.0/src/commands/accessories.ts)_

## `mailscript addresses SUBCOMMAND`

manipulate addresses

```
USAGE
  $ mailscript addresses SUBCOMMAND

OPTIONS
  -h, --help             show CLI help
  -n, --address=address  the address
```

_See code: [src/commands/addresses.ts](https://github.com/getmailscript/cli/blob/v0.2.0/src/commands/addresses.ts)_

## `mailscript automations SUBCOMMAND`

manipulate workspaces

```
USAGE
  $ mailscript automations SUBCOMMAND

OPTIONS
  -a, --action=action    id of the action accessory
  -h, --help             show CLI help
  -t, --trigger=trigger  id of the trigger accessory
```

_See code: [src/commands/automations.ts](https://github.com/getmailscript/cli/blob/v0.2.0/src/commands/automations.ts)_

## `mailscript help [COMMAND]`

display help for mailscript

```
USAGE
  $ mailscript help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_

## `mailscript login`

Link or create your MailScript account

```
USAGE
  $ mailscript login

DESCRIPTION
  Link or create your MailScript account
```

_See code: [src/commands/login.ts](https://github.com/getmailscript/cli/blob/v0.2.0/src/commands/login.ts)_

## `mailscript workspaces SUBCOMMAND`

manipulate workspaces

```
USAGE
  $ mailscript workspaces SUBCOMMAND

OPTIONS
  -h, --help       show CLI help
  -n, --name=name  name of the workspace
```

_See code: [src/commands/workspaces.ts](https://github.com/getmailscript/cli/blob/v0.2.0/src/commands/workspaces.ts)_
<!-- commandsstop -->

# Development

In development a `.env` file is used:

```shell
MAILSCRIPT_LOGIN_URL=http://localhost:3000
```

To run a command:

```shell
nvm use
node bin/run accessories
```

