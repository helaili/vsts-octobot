const fernet = require('fernet')

module.exports = class persistence {
  constructor (fernetSecret) {
    this.secret = new fernet.Secret(fernetSecret)
    this.db = {}
  }

  set (installationId, token) {
    let fernetToken = new fernet.Token({secret: this.secret})
    let encodedToken = fernetToken.encode(token)
    this.db[installationId] = encodedToken
    return encodedToken
  }

  get (installationId) {
    var token = new fernet.Token({
      secret: this.secret,
      token: this.db[installationId],
      ttl: 0
    })
    return token.decode()
  }
}
