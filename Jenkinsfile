def jfrogToken = "cmVmdGtuOjAxOjE3MDc4MzExNjE6UldFSkJtb2d0MzJESzVqWklMYTRtSjR3bkxU"
def jfrogRepoPath = "https://sambhalreg.jfrog.io/artifactory/generic-local/files"
def binaryFilePath = "build/agent.exe"
def properties = "version=${BUILD_ID}"
def jfrogFileName = "agent-win"

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
                sh 'npm run bin:win'
            }
        }
        stage('Push the binary to jFrog') {
            steps {
                sh "curl -f -H 'Authorization: Bearer ${jfrogToken}' -XPUT '${jfrogRepoPath}/${jfrogFileName}-${BUILD_ID};${properties}' -T ${binaryFilePath}"
                sh "curl -f -H 'Authorization: Bearer ${jfrogToken}' -XPUT '${jfrogRepoPath}/${jfrogFileName}-latest;${properties}' -T ${binaryFilePath}"
            }
        }
    }
}
