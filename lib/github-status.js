module.exports = class GitHubStatus {
  constructor (sha, state, target, description, context) {
    this.sha = sha
    this.state = state
    this.target = target
    this.description = description
    this.context = context
  }

  get payload () {
    return {
      sha: this.sha,
      state: this.state,
      target_url: this.target,
      description: this.description,
      context: this.context
    }
  }

  send (githubContext, cb) {
    let statusData = githubContext.issue(this.payload)

    githubContext.github.repos.createStatus(statusData).then((status) => {
      if (status.data.id) {
        return cb(status)
      } else {
        // Something terribly wrong happened
        console.error('Failed to send status to GitHub while using ', statusData, 'Result was ', status)
        return null
      }
    })
  }
}
