/* global describe, beforeEach, it */

const expect = require('expect')
const {createRobot} = require('probot')
const app = require('..')
const GitHubStatus = require('../lib/github-status')
const createCommitStatus = require('./fixtures/createCommitStatus.json')

require('dotenv').config()

describe('GitHub Status', () => {
  let robot
  let githubContext

  beforeEach(() => {
    robot = createRobot()
    app(robot)

    githubContext = {
      issue: expect.createSpy().andReturn(Promise.resolve({
        data: createCommitStatus
      })),
      github: {
        repos: {
          createStatus: expect.createSpy().andReturn(Promise.resolve({
            data: {
              id: 1674827256
            }
          }))
        }
      }
    }

    // Passes the mocked out GitHub API into out robot instance
    robot.auth = () => {
      return Promise.resolve(githubContext.github)
    }
  })

  describe('When calling send,', () => {
    it('A commit status is created', async () => {
      let ghStatus = new GitHubStatus('39467a0d884b826db3bbfc1889de02c5c37b4170')
      let spy = expect.createSpy((status) => {
        return status
      })
      await ghStatus.send(githubContext, 'pending', 'https://github.com', 'Building...', 'continuous-integration/vsts', spy)

      expect(githubContext.github.repos.createStatus).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })
  })
})
