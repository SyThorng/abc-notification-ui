pipeline {
    agent any

    environment {
        DH_IMAGE = "abc-notification-ui"
        VERSION  = "${GIT_COMMIT[0..7]}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    sh '''
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        docker build -t $DH_USER/abc-notification-ui:$VERSION .
                        docker tag $DH_USER/abc-notification-ui:$VERSION \
                                   $DH_USER/abc-notification-ui:latest
                    '''
                }
            }
        }

        stage('Trivy Scan') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    sh '''
                        trivy image \
                            --severity CRITICAL,HIGH,MEDIUM \
                            --format table \
                            --output trivy-report.txt \
                            --exit-code 0 \
                            $DH_USER/abc-notification-ui:$VERSION
                        cat trivy-report.txt
                    '''
                }
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    sh '''
                        docker push $DH_USER/abc-notification-ui:$VERSION
                        docker push $DH_USER/abc-notification-ui:latest
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            withCredentials([
                usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                ),
                string(credentialsId: 'TELEGRAM_BOT_TOKEN', variable: 'TG_TOKEN'),
                string(credentialsId: 'TELEGRAM_CHAT_ID',  variable: 'TG_CHAT')
            ]) {
                script {
                    def status = currentBuild.currentResult
                    def icon = (status == 'SUCCESS') ? '✅' : '❌'
                    def msg = "${icon} Build ${status} - abc-notification-ui\n" +
                              "Image: ${env.DH_USER}/abc-notification-ui:${env.VERSION}\n" +
                              "Commit: ${env.VERSION}\n" +
                              "Scanner: Trivy\n" +
                              "Job: ${env.BUILD_URL}"

                    sh """
                        curl -s -X POST "https://api.telegram.org/bot\${TG_TOKEN}/sendMessage" \
                            --data-urlencode "chat_id=\${TG_CHAT}" \
                            --data-urlencode "text=${msg}" \
                            --data-urlencode "parse_mode=Markdown"
                    """

                    if (fileExists('trivy-report.txt')) {
                        sh """
                            curl -s -X POST "https://api.telegram.org/bot\${TG_TOKEN}/sendDocument" \
                                -F "chat_id=\${TG_CHAT}" \
                                -F "document=@trivy-report.txt" \
                                -F "caption=Trivy scan - abc-notification-ui:${env.VERSION}"
                        """
                    }
                }
            }
        }
    }
}