const express = require('express')
const router = express.Router()
const user = require('./../../module/user')
const invitation = require('./../../module/invitation')
const permission = require('./../../module/permission')
const config = require('../../module/config')

router.post('/login', async (req, res) => {
  const body = req.body
  if (body && body.username && body.password) {
    const result = await user.checkByUsernameAndPassword(body.username, body.password)

    if (result.token) {
      const per = await permission.getUserPermissionGroupInfo(result.id)
      if (per.rule.banned) {
        res.json({
          code: -1,
          msg: 'You had been banned',
          data: {}
        })
        return
      }
      res.cookie('token', result.token, {
        maxAge: (new Date()).getTime() / 1000 + 1000 * 3600 * 24 * 180,
        path: '/'
      })

      res.json({
        code: 0,
        msg: 'Success',
        data: {
          token: result.token
        }
      })
      return
    } else {
      res.json({
        code: -1,
        msg: 'Username or password wrong',
        data: {}
      })
      return
    }
  }

  res.json({
    code: -2,
    msg: 'Invalid body',
    data: {}
  })
})

router.post('/signup', async (req, res) => {
  const body = req.body
  if (body && body.username && body.password) {
    if (!config.get('system.allowSignup') && !body.code) {
      res.json({
        code: -2,
        msg: 'Param error',
        data: {}
      })

      return
    }

    const username = `${body.username}`.substring(0, 32)

    if (config.get('system.allowSignup')) {
      const uid = await user.createUser(username, body.password, config.get('system.defaultGroup'), '', 'direct signup')
      if (uid === -1) {
        res.json({
          code: -2,
          msg: 'Username exists',
          data: {}
        })
        return
      }

      res.json({
        code: 0,
        msg: 'Success',
        data: {
          uid
        }
      })
      return
    }

    res.json(await invitation.createUserUseInvitation(body.code, username, body.password))
    return
  }

  res.json({
    code: -2,
    msg: 'Invalid body',
    data: {}
  })
})

router.get('/check', async (req, res) => {
  let result = false
  if (req.uid && req.uid > 0) result = true

  if (result) {
    const group = await permission.getUserPermissionGroupInfo(req.uid)

    res.json({
      code: 0,
      msg: 'Success',
      data: {
        isLogin: true,
        permission: group
      }
    })
  } else {
    res.json({
      code: 0,
      msg: 'Success',
      data: {
        isLogin: false
      }
    })
  }
})

router.get('/getStatus', async (req, res) => {
  res.json({
    code: 0,
    msg: 'Success',
    data: {
      allowSignup: config.get('system.allowSignup')
    }
  })
})

router.all('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({
    code: 0,
    msg: 'Success',
    data: {}
  })
})

module.exports = router
