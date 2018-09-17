pipeline {
    agent { docker { image 'node:10.8-slim' } }
    stages {
        stage('build') {
            steps {
                sh 'npm --version'
            }
        }
    }
}