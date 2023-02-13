pipeline {
    agent any

    stages {
        stage('Hello') {
            steps {
                echo 'Hello World'
            }
        }
         stage('Install dependencies') {
            steps {
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
