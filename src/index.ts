#!/usr/bin/env node

import * as minimist from 'minimist'
import { Command, SystemEnvironment } from './types'
import pushCommand from './commands/push'
import consoleCommand from './commands/console'
import playgroundCommand from './commands/playground'
import projectsCommand from './commands/projects'
import pullCommand from './commands/pull'
import authCommand from './commands/auth'
import initCommand from './commands/init'
import interactiveInitCommand from './commands/interactiveInit'
import exportCommand from './commands/export'
import endpointsCommand from './commands/endpoints'
import statusCommand from './commands/status'
import FileSystemResolver from './system/FileSystemResolver'
import figures = require('figures')
import StdOut from './system/StdOut'
import { GraphcoolAuthServer } from './api/GraphcoolAuthServer'
import { readGraphcoolConfig } from './utils/file'
import {
  sentryId,
  sentryKey
} from './utils/constants'
import {
  usagePull,
  usageProjects,
  usageInit,
  usageRoot,
  usagePush,
  usageAuth,
  usageVersion,
  usageConsole,
  usageExport,
  usageEndpoints,
  usagePlayground,
  usageStatus
} from './utils/usage'

var Raven = require('raven')
const debug = require('debug')('graphcool')
const {version} = require('../../package.json')

async function main() {

  // initialize sentry
  Raven.config(`https://${sentryKey}@sentry.io/${sentryId}`).install()

  const argv = minimist(process.argv.slice(2))

  const command = argv._[0] as Command | undefined

  switch (command) {

    case undefined: {
      process.stdout.write(usageRoot)
      process.exit(0)
    }

    // TODO remove legacy support
    case 'create': {
      checkHelp(argv, usageInit)
      await checkAuth()

      const name = argv['name'] || argv['n']
      const alias = argv['alias'] || argv['a']
      const region = argv['region'] || argv['r']
      const schemaUrl = argv._[1]
      const remoteSchemaUrl = schemaUrl
      const localSchemaFile = schemaUrl

      const props = {name, alias, remoteSchemaUrl, localSchemaFile, region}
      await initCommand(props, defaultEnvironment())
      break
    }

    case 'init': {
      checkHelp(argv, usageInit)

      const name = argv['name'] || argv['n']
      const alias = argv['alias'] || argv['a']
      const region = argv['region'] || argv['r']
      const schemaUrl = argv['schema'] || argv['s']
      const copyProjectId = argv['copy'] || argv['c']
      const copyOptions = argv['copy-options']
      const outputPath = argv['output'] || argv['o']

      if (!schemaUrl && !copyProjectId) {
        const props = {name, alias, outputPath, checkAuth}
        await interactiveInitCommand(props, defaultEnvironment())
      } else {
        await checkAuth()

        const props = {name, alias, schemaUrl, copyProjectId, copyOptions, region, outputPath}
        await initCommand(props, defaultEnvironment())
      }
      break
    }

    case 'push': {
      checkHelp(argv, usagePush)
      await checkAuth()

      const force = !!(argv['force'] || argv['f'])
      const projectFile = argv._[1]
      await pushCommand({force, projectFile}, defaultEnvironment())
      break
    }

    case 'pull': {
      checkHelp(argv, usagePull)
      await checkAuth()

      const sourceProjectId = argv['source'] || argv['s']
      const projectFile = argv._[1]
      const outputPath = argv['output'] || argv['o']
      const force = !!(argv['force'] || argv['f'])
      await pullCommand({sourceProjectId, projectFile, outputPath, force}, defaultEnvironment())
      break
    }

    case 'export': {
      checkHelp(argv, usageExport)
      await checkAuth()

      const projectFile = argv._[1]
      await exportCommand({projectFile}, defaultEnvironment())
      break
    }

    case 'status': {
      checkHelp(argv, usageStatus)
      await checkAuth()

      const projectFile = argv._[1]
      await statusCommand({projectFile}, defaultEnvironment())
      break
    }

    case 'endpoints': {
      checkHelp(argv, usageEndpoints)
      await checkAuth()

      const projectFile = argv._[1]
      await endpointsCommand({projectFile}, defaultEnvironment())
      break
    }

    case 'console': {
      checkHelp(argv, usageConsole)
      await checkAuth()

      const projectFile = argv._[1]
      await consoleCommand({projectFile}, defaultEnvironment())
      break
    }

    case 'playground': {
      checkHelp(argv, usagePlayground)
      await checkAuth()

      const projectFile = argv._[1]
      await playgroundCommand({projectFile}, defaultEnvironment())
      break
    }


    case 'projects': {
      checkHelp(argv, usageProjects)
      await checkAuth()

      await projectsCommand({}, defaultEnvironment())
      break
    }

    case 'auth': {
      checkHelp(argv, usageAuth)

      const token = argv['token'] || argv['t']
      await authCommand({token}, defaultEnvironment(), new GraphcoolAuthServer())
      break
    }

    case 'help': {
      process.stdout.write(usageRoot)
      process.exit(0)
      break
    }

    case 'version': {
      checkHelp(argv, usageVersion)

      process.stdout.write(version)
      break
    }

    default: {
      process.stdout.write(`Unknown command: ${command}\n\n${usageRoot}`)
      break
    }
  }

  process.stdout.write('\n')
}

async function checkAuth() {
  try {
    readGraphcoolConfig(new FileSystemResolver())
  } catch (e) {
    await authCommand({}, defaultEnvironment(), new GraphcoolAuthServer())
  }
}

function checkHelp(argv: any, usage: string) {
  if (argv['help'] || argv['h']) {
    process.stdout.write(usage)
    process.exit(0)
  }
}

function defaultEnvironment(): SystemEnvironment {
  return {
    resolver: new FileSystemResolver(),
    out: new StdOut()
  }
}

process.on('unhandledRejection', e => new StdOut().onError(e))

main()