module.exports = class GitHubStatus {
  constructor (sha) {
    this.sha = sha
  }

  payload (state, target, description, context) {
    return {
      sha: this.sha,
      state: state,
      target_url: target,
      description: description,
      context: context
    }
  }

  send (githubContext, state, target, description, context, cb) {
    let statusData = githubContext.issue(this.payload(state, target, description, context))

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
