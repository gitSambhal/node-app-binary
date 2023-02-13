def jfrogToken = "cmVmdGtuOjAxOjE3MDc4MzExNjE6UldFSkJtb2d0MzJESzVqWklMYTRtSjR3bkxU"
def jfrogRepoPath = "https://sambhalreg.jfrog.io/artifactory/generic-local/files"
def binaryFilePath = "build/agent-bin"

pipeline {
    agent any
    tools {nodejs "nodejs"}

    stages {
         stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }
        stage('Build the binary') {
            steps {
                sh 'npm run bin:mac'
            }
        }
        stage('Push the binary to jFrog') {
            steps {
                sh "curl -s -o /dev/null -H 'Authorization: Bearer ${jfrogToken}' -XPUT '${jfrogRepoPath}/agent-${BUILD_ID}' -T ${binaryFilePath}"
            }
        }
    }
}
