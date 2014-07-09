mountFolder = (connect, dir) ->
  connect.static(require('path').resolve(dir))

module.exports = (grunt) ->

  # Loads all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  grunt.initConfig

    pkg: grunt.file.readJSON 'package.json'

    coffee:
      options:
        bare: true
      build:
        files:
          'src/build/index.js': 'src/diyselect.coffee'

    sass:
      build:
        options:
          style: 'expanded'
        files:
          'src/build/index.css': 'src/diyselect.scss'

    concat:
      js:
        src: [
          'src/wrapper_header.js'
          'src/build/index.js'
          'src/wrapper_footer.js'
        ]
        dest: 'src/build/index.js'

    copy:
      dist:
        src: 'src/build/index.css'
        dest: 'dist/styles/<%= pkg.filename %>.css'

    clean:
      build:
        src: ['src/build/*']

    watch:
      build:
        files: ['src/*']
        tasks: ['build']

    connect:
      demo:
        options:
          middleware: (connect) ->
            [mountFolder(connect, '')]

  grunt.registerTask 'build', ['clean:build', 'coffee:build', 'concat:js', 'sass:build']
  grunt.registerTask 'server', ['build', 'connect', 'watch']
