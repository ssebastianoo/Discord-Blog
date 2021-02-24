/*
 * Copyright (c) 2020 Cynthia K. Rey
 * Licensed under the Open Software License version 3.0
 */

const { existsSync, createReadStream } = require('fs')
const { resolve } = require('path')
const mime = require('mime-types')
const https = require('https')
const ejs = require('ejs')
const { minify } = require('html-minifier')

const markdown = require('./src/markdown')
const Formatter = require('./src/formatter')

// Stuff
const assets = require('./src/assets')
const config = require('./config')
var testData = require('./example')

require('http')
  .createServer((req, res) => {
    if (![ 'GET', 'POST' ].includes(req.method)) {
      res.writeHead(405)
      return res.end()
    }

    // Assets
    if (req.url.startsWith('/dist/')) {
      const target = req.url.split('/')[2]
      const file = resolve(__dirname, 'dist', target)
      if (existsSync(file) && target && target !== '.' && target !== '..') {
        res.setHeader('content-type', mime.lookup(file) || 'application/octet-stream')
        return createReadStream(file).pipe(res)
      }
    }

    // Attachments
    if (req.url.startsWith('/attachments/')) {
      const headers = {}
      if (req.headers.range) {
        headers.range = req.headers.range
      }

      https.get({
        host: 'cdn.discordapp.com',
        path: req.url,
        port: 443,
        headers
      }, resp => {
        delete resp.headers['content-disposition']
        res.writeHead(resp.statusCode, {
          ...resp.headers,
          'Access-Control-Allow-Origin': '*'
        })
        resp.pipe(res)
      })
      return
    }

    // Server
    const handler = async (data) => {
      const fm = new Formatter(data)
      const formatted = await fm.format()
      if (!formatted) {
        res.writeHead(400)
        return res.end()
      }
      const hostname = config.hostname ? config.hostname : `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`
      ejs.renderFile('./views/index.ejs', {
        data: formatted,
        assets,
        markdown,
        hostname
      }, null, (err, str) => {
        if (err) {
          res.writeHead(500)
          res.end('Internal Server Error')
          console.error(err)
        }
        res.end(minify(str, {
          collapseWhitespace: true,
          removeComments: true
        }))
      })
    }

    res.setHeader('content-type', 'text/html')
    if (req.method === 'POST') {
      let data = ''
      req.on('data', chunk => (data += chunk))
      req.on('end', () => handler(JSON.parse(data)))
    } else {
      return handler(testData)
    }
  }).listen(config.port)
