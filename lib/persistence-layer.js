const fernet = require('fernet')
const redis = require('redis')

let redisClient
let redisURL = process.env.REDIS_URL

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

  saveInstallation (installationId, key, value) {
    return new Promise((resolve, reject) => {
      redisClient.hget(this.getEncodedInstallationKey(installationId), (err, reply) => {
        if (err) {
          reject(err)
        } else {
          let obj
          if (reply && reply !== 'null') {
            obj = reply
          } else {
            obj = {}
          }
          obj[key] = value
          redisClient.hset(this.getEncodedInstallationKey(installationId), obj, (setErr, setReply) => {
            if (setErr) {
              reject(setErr)
            } else {
              resolve(setReply)
            }
          })
        }
      })
    })
  }

  getInstallation (installationId) {
    return new Promise((resolve, reject) => {
      redisClient.hget(this.getEncodedInstallationKey(installationId), (err, reply) => {
        if (err) {
          reject(err)
        } else {
          console.log(installationId, reply, reply.encodedToken)
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

  setToken (installationId, token) {
    let fernetToken = new fernet.Token({secret: this.secret})
    let encodedToken = fernetToken.encode(token)
    return this.saveInstallation(installationId, 'encodedToken', encodedToken)
  }

  setServiceHookId (installationId, serviceHookId) {
    return this.saveInstallation(installationId, 'serviceHookId', serviceHookId)
  }

  saveContext (build, probotContext) {
    return new Promise((resolve, reject) => {
      let link = build._links.web.href
      let key = this.getEncodedBuildKey(build.project.id, build.definition.id, build.buildNumber)
      let value = {
        projectId: build.project.id,
        definitionId: build.definition.id,
        buildNumber: build.buildNumber,
        link: link,
        probotContext: probotContext
      }

      redisClient.hset(key, value, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          resolve(reply)
        }
      })
    })
  }

  getContext (projectId, definitionId, buildNumber) {
    return new Promise((resolve, reject) => {
      let key = this.getEncodedBuildKey(projectId, definitionId, buildNumber)
      redisClient.hget(key, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          if (reply && reply !== 'null') {
            resolve(reply)
          } else {
            resolve(null)
          }
        }
      })
    })
  }
}
