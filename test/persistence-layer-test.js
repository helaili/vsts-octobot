/* global describe, it */

const expect = require('expect')
const PersistenceLayer = require('../lib/persistence-layer')

describe('Persistence Layer', () => {
  let sensitiveString = 'xxxxxxx'
  let key = 42
  let fernetSecret = 'cw_0x689RpI-jtRR7oE8h_eQsKImvJapLeSbXpwF4e4='

  it('Encodes a string', () => {
    let persistence = new PersistenceLayer(fernetSecret)
    persistence.setToken(key, sensitiveString).then((encodedToken) => {
      expect(encodedToken).toExist()
      expect(encodedToken).toBeA('string')
      expect(encodedToken).toNotEqual(sensitiveString)
    })
  })

  it('Retrieves a decoded string', async () => {
    let persistence = new PersistenceLayer(fernetSecret)
    await persistence.setToken(key, sensitiveString)
    persistence.getInstallation(key).then((decodedSensitiveString) => {
      expect(decodedSensitiveString).toExist()
      expect(decodedSensitiveString).toEqual(sensitiveString)
    })
  })
})
