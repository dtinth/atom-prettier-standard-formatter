'use babel'
const { create } = require('process-communication')

const prettierStandardFormatter = require('prettier-standard-formatter')
const communication = create()

communication.onRequest('format', function (data, message) {
  message.response = prettierStandardFormatter.format(data.source)
})
