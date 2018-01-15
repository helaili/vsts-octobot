/* global describe, it, beforeEach */

const expect = require('expect')
const PersistenceLayer = require('../lib/persistence-layer')

describe('Persistence Layer', () => {
  const fernetSecret = 'cw_0x689RpI-jtRR7oE8h_eQsKImvJapLeSbXpwF4e4='
  let sensitiveString = 'xxxxxxx'
  let key = 42
  let persistence

  beforeEach(() => {
    persistence = new PersistenceLayer(fernetSecret)
    persistence.deleteInstallation(key)
    persistence.deleteContext('42', '42', '42')
  })

  it('Encodes a string', async () => {
    await persistence.setCredentials(key, sensitiveString).then((retCode) => {
      expect(retCode).toEqual(1)
    })
  })

  it('Retrieves a decoded string', async () => {
    await persistence.setCredentials(key, sensitiveString)
    await persistence.getInstallation(key).then((installation) => {
      expect(installation).toExist()
      expect(installation.vstsToken).toEqual(sensitiveString)
    })
  })

  it('Retrieves a context', async () => {
    let build = {
      _links: {
        web: {
          href: 'https://github.com'
        }
      },
      project: {
        id: '42'
      },
      definition: {
        id: '42'
      },
      buildNumber: '42'
    }
    let dog = {
      name: 'Skippy',
      food: 'Bacon',
      hobbies: ['bark', 'catch'],
      fur: {
        color: 'red',
        spots: 'white'
      }
    }
    await persistence.savePayload(build, dog)
    await persistence.getPayload('42', '42', '42').then((context) => {
      expect(context).toExist()
      expect(context.payload.fur.color).toEqual('red')
    })
  })
})
