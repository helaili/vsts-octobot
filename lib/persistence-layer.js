/* eslint-disable no-eval */
const fernet = require('fernet')
const redis = require('redis')

let redisClient
let redisURL = process.env.REDIS_URL | process.env.DATABASE_URL

if (redisURL) {
  redisClient = redis.createClient(redisURL)
} else {
  redisClient = redis.createClient()
}

redisClient.on('error', function (err) {
  console.log('Error ' + err)
})

module.exports = class persistence {
  constructor (fernetSecret) {
    this.secret = new fernet.Secret(fernetSecret)
  }

  getEncodedInstallationKey (key) {
    return `GitHub::vsts-octobot::installation::${key}`
  }

  getEncodedBuildKey (projectId, definitionId, buildNumber) {
    return `GitHub::vsts-octobot::build::${projectId}-${definitionId}-${buildNumber}`
  }

  saveInstallationAttribute (installationId, key, value) {
    return new Promise((resolve, reject) => {
      redisClient.hset(this.getEncodedInstallationKey(installationId), key, value, (setErr, setReply) => {
        if (setErr) {
          reject(setErr)
        } else {
          resolve(setReply)
        }
      })
    })
  }

  getInstallation (installationId) {
    return new Promise((resolve, reject) => {
      redisClient.hgetall(this.getEncodedInstallationKey(installationId), (err, reply) => {
        if (err) {
          reject(err)
        } else if (reply == null) {
          reject(new Error('Unknown installation'))
        } else {
          var token = new fernet.Token({
            secret: this.secret,
            token: reply.encodedToken,
            ttl: 0
          })
          reply.vstsToken = token.decode()
          resolve(reply)
        }
      })
    })
  }

  deleteInstallation (installationId) {
    return new Promise((resolve, reject) => {
      redisClient.hdel(this.getEncodedInstallationKey(installationId), 'encodedToken', 'serviceHookId', (setErr, setReply) => {
        if (setErr) {
          reject(setErr)
        } else {
          resolve(setReply)
        }
      })
    })
  }

  deleteContext (projectId, definitionId, buildNumber) {
    return new Promise((resolve, reject) => {
      redisClient.hdel(this.getEncodedInstallationKey(projectId, definitionId, buildNumber), 'projectId', 'definitionId', 'buildNumber', 'link', 'payload', (setErr, setReply) => {
        if (setErr) {
          reject(setErr)
        } else {
          resolve(setReply)
        }
      })
    })
  }

  setCredentials (installationId, credentials) {
    let fernetToken = new fernet.Token({secret: this.secret})
    let encodedCredentials = fernetToken.encode(credentials)

    return this.saveInstallationAttribute(installationId, 'encodedToken', encodedCredentials)
  }

  setServiceHookId (installationId, serviceHookId) {
    return this.saveInstallationAttribute(installationId, 'serviceHookId', serviceHookId)
  }

  savePayload (build, payload) {
    return new Promise((resolve, reject) => {
      let link = build._links.web.href
      let key = this.getEncodedBuildKey(build.project.id, build.definition.id, build.buildNumber)
      let value = {
        projectId: build.project.id,
        definitionId: build.definition.id,
        buildNumber: build.buildNumber,
        link: link,
        payload: JSON.stringify(payload)
      }

      redisClient.hmset(key, value, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          resolve(reply)
        }
      })
    })
  }

  getPayload (projectId, definitionId, buildNumber) {
    return new Promise((resolve, reject) => {
      let key = this.getEncodedBuildKey(projectId, definitionId, buildNumber)

      redisClient.hgetall(key, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          if (reply && reply !== 'null') {
            reply.payload = JSON.parse(reply.payload)
            resolve(reply)
          } else {
            resolve(null)
          }
        }
      })
    })
  }
}
