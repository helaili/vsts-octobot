const axios = require('axios')

module.exports = class WebApi {
  constructor (baseURL, collection, username, token, logger) {
    this.logger = logger
    let authorizationHeader = 'Basic ' + Buffer.from(`${username}:${token}`).toString('base64')
    this.collection = collection

    console.log(`*************** ${authorizationHeader} ********************`)


    this.http = axios.create({
      'baseURL': baseURL,
      'timeout': 5000,
      'headers': {
        'Authorization': authorizationHeader,
        'Accept': 'application/json'
      }
    })
  }

  async createSubscription (subscription) {
    return new Promise((resolve, reject) => {
      console.log(subscription)
      this.http.post('/_apis/hooks/subscriptions?api-version=4.1-preview', subscription).then((res) => {
        resolve(res.data)
      }, (error) => {
        reject(error)
      })
    })
  }

  async getDefinition (buildDefinitionId, project) {
    return new Promise((resolve, reject) => {
      let definitionURL =  `/${this.collection}/${project}/_apis/build/definitions/${buildDefinitionId}?api-version=4.1-preview`
      this.http.get(definitionURL).then((res) => {
        this.logger.trace(`Retrieved VSTS build definition at ${definitionURL}\n`, res.data)
        resolve(res.data)
      }, (error) => {
        reject(error)
      })
    })
  }

  async queueBuild (build, project) {
    return new Promise((resolve, reject) => {
      let config = {
        'headers': {
          'Content-Type': 'application/json'
        }
      }
      this.logger.trace("Queuing build:\n", build)
      this.http.post(`/${this.collection}/${project}/_apis/build/builds?api-version=4.1-preview`, build, config).then((res) => {
        resolve(res.data)
      }, (error) => {
        reject(error)
      })
    })
  }
}
