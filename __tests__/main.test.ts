import * as core from '@actions/core'
import * as main from '../src/main'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Other utilities
const timeRegex = /^\d{2}:\d{2}:\d{2}/

// Mock the GitHub Actions core library
let debugMock: jest.SpyInstance
let errorMock: jest.SpyInstance
let getInputMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance
let setOutputMock: jest.SpyInstance

describe('action', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...OLD_ENV }

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()

    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'username':
          return 'my-username'
        case 'audience':
          return 'dev.nugettest.org'
        case 'package-source':
          return 'https://apidev.nugettest.org/v3/index.json'
        default:
          return ''
      }
    })

    process.env.ACTIONS_RUNTIME_TOKEN = `a.${btoa(JSON.stringify({ iss: 'me' }))}.z`
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL = `https://example/my-token-endpoint`
  })

  afterAll(() => {
    process.env = OLD_ENV
  });

  it('sets the token-info output', async () => {
    await main.run()

    expect(runMock).toHaveReturned()
    expect(debugMock).toHaveBeenNthCalledWith(1, 'Input username: my-username')
    expect(debugMock).toHaveBeenNthCalledWith(2, 'Input audience: dev.nugettest.org')
    expect(debugMock).toHaveBeenNthCalledWith(3, 'Input package source: https://apidev.nugettest.org/v3/index.json')
    expect(debugMock).toHaveBeenNthCalledWith(4, 'Runtime token payload: {"iss":"me"}')
    expect(debugMock).toHaveBeenNthCalledWith(5, 'Token URL: https://example/my-token-endpoint')
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'token-info', JSON.stringify({
      audience: "dev.nugettest.org",
      packageSource: "https://apidev.nugettest.org/v3/index.json",
      runtimeToken: "a.eyJpc3MiOiJtZSJ9.z",
      tokenUrl: "https://example/my-token-endpoint",
      username: "my-username",
    }))
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires username input', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'The username input value must be set')
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires audience input', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'username':
          return 'my-username'
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'The audience input value must be set')
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires package-source input', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'username':
          return 'my-username'
        case 'audience':
          return 'dev.nugettest.org'
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'The package-source input value must be set')
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires valid package source URL', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'username':
          return 'my-username'
        case 'audience':
          return 'dev.nugettest.org'
        case 'package-source':
          return 'invalid'
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'An valid HTTPS package source URL is required')
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires HTTPS package source URL', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'username':
          return 'my-username'
        case 'audience':
          return 'dev.nugettest.org'
        case 'package-source':
          return 'http://apidev.nugettest.org/v3/index.json' // DevSkim: ignore DS137138
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'An HTTPS package source URL is required. The value provided protocol was http:')
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires ACTIONS_RUNTIME_TOKEN env var', async () => {
    process.env.ACTIONS_RUNTIME_TOKEN = ''

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'The ACTIONS_RUNTIME_TOKEN environment variable must be set')
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires ACTIONS_ID_TOKEN_REQUEST_URL env var', async () => {
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL = ''

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'The ACTIONS_ID_TOKEN_REQUEST_URL environment variable must be set')
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })
})
