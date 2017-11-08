/* global describe, it */

const expect = require('expect')
const vt = require('../lib/view-template')

describe('View Template', () => {
  it('The file is loaded as a string', () => {
    let view = vt.getView('./views/setup.html')
    expect(view).toExist()
    expect(view).toBeA('string')
  })
  it('A substitution is performed', () => {
    let view = vt.getView('./views/setup.html')
    let installationId = 42
    view = view.replace('{{installation_id}}', installationId)
    expect(view.includes('42')).toBe(true)
  })
})
