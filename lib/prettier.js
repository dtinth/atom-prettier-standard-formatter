'use babel'
/* global atom */

const { forkFile } = require('process-communication')

var path = require('path')
var findRoot = require('find-root')
var communication = forkFile(require.resolve('./worker'))

var prettierStandardFormatter = {
  format: source => {
    return communication.request('format', { source })
  }
}

module.exports = {
  style: null,
  fileTypes: [ '.js', '.jsx' ],
  fileSupported: function (file) {
    // Ensure file is a supported file type.
    var ext = path.extname(file)
    return !!~this.fileTypes.indexOf(ext)
  },
  activate: function () {
    this.commands = atom.commands.add(
      'atom-workspace',
      'prettier-standard-formatter:format',
      function () {
        this.format()
      }.bind(this)
    )

    this.editorObserver = atom.workspace.observeTextEditors(
      this.handleEvents.bind(this)
    )
  },
  deactivate: function () {
    this.commands.dispose()
    this.editorObserver.dispose()
  },
  format: function (options) {
    if (options === undefined) {
      options = {}
    }
    var selection = typeof options.selection === 'undefined'
      ? true
      : !!options.selection
    var editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      // Return if the current active item is not a `TextEditor`
      return
    }
    var selectedText = selection ? editor.getSelectedText() : null
    var text = selectedText || editor.getText()
    var cursorPosition = editor.getCursorScreenPosition()

    return prettierStandardFormatter
      .format(text)
      .then(transformed => {
        if (selectedText) {
          editor.setTextInBufferRange(
            editor.getSelectedBufferRange(),
            transformed
          )
        } else {
          editor.setText(transformed)
        }
        editor.setCursorScreenPosition(cursorPosition)
      })
      .catch(e => {
        console.log('Error transforming using prettier:', e)
      })
  },
  handleEvents: function (editor) {
    editor.getBuffer().onWillSave(
      function () {
        var path = editor.getPath()
        if (!path) {
          return
        }

        if (!editor.getBuffer().isModified()) {
          return
        }

        var formatOnSave = atom.config.get(
          'prettier-standard-formatter.formatOnSave',
          { scope: editor.getRootScopeDescriptor() }
        )
        if (!formatOnSave) {
          return
        }

        // Set the relative path based on the file's nearest package.json.
        // If no package.json is found, use path verbatim.
        var relativePath
        try {
          var projectPath = findRoot(path)
          relativePath = path.replace(projectPath, '').substring(1)
        } catch (e) {
          relativePath = path
        }

        if (this.fileSupported(relativePath)) {
          this.format({ selection: false })
        }
      }.bind(this)
    )
  },
  config: { formatOnSave: { type: 'boolean', default: false } }
}
