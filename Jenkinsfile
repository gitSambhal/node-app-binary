pipeline {
    agent any
    tools {nodejs "nodejs"}

    stages {
        stage('Hello') {
            steps {
                echo 'Hello World'
            }
        }
         stage('Install dependencies') {
            steps {
                sh 'which node'
                sh 'node -v'
                sh 'npm -v'
                sh 'npm install'
            }
        }
        stage('Build the app') {
            steps {
                sh 'npm run bin:mac'
            }
        }
        
    }
}
