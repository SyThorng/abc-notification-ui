pipeline {
    agent any

    environment {
        IMAGE_NAME    = "abc-notification-ui"
        DOCKER_HUB_ID = "sythorng"
        IMAGE_FULL    = "${DOCKER_HUB_ID}/${IMAGE_NAME}"
        IMAGE_TAG     = "${IMAGE_FULL}:${BUILD_NUMBER}"
        IMAGE_LATEST  = "${IMAGE_FULL}:latest"

        DOCKERHUB_CRED  = "dockerhub-credentials"
        TELEGRAM_CRED   = "telegram-bot-token"
        TELEGRAM_CHAT   = "telegram-chat-id"
        GCP_SSH_CRED    = "gcp-ssh-key"
        GCP_HOST        = "34.1.11.84"
        GCP_USER        = "hostingdevop"
        CONTAINER_NAME  = "abc-notification-ui"
        HOST_PORT       = "3000"
        CONTAINER_PORT  = "80"
        SONAR_TOKEN     = credentials('sonarqube-token')   // FIX: add SonarQube token credential
        SONAR_SCANNER_HOME = tool 'SonarQube Scanner'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo "Code checked out from GitHub"
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} .
                """
                echo "Docker image built: ${IMAGE_TAG}"
            }
        }

        stage('SonarQube Scan') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh """
                        ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
                        -Dsonar.projectKey=abc-notification-ui \
                        -Dsonar.sources=. \
                        -Dsonar.host.url=https://sonar.sythorng.codes \
                        -Dsonar.token=${SONAR_TOKEN} \
                        -Dsonar.exclusions=**/node_modules/**,**/*.test.js
                    """
                }
            }
        }

        // FIX: added Quality Gate check so pipeline fails if scan does not pass
        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "SonarQube Quality Gate failed: ${qg.status}"
                        }
                    }
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKERHUB_CRED}",
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    // FIX: changed single-quotes to double-quotes so Groovy
                    // interpolates IMAGE_TAG and IMAGE_LATEST before the shell runs
                    sh """
                        echo "\$DH_PASS" | docker login -u "\$DH_USER" --password-stdin
                        docker push ${IMAGE_TAG}
                        docker push ${IMAGE_LATEST}
                        docker logout
                    """
                }
                echo "Image pushed: ${IMAGE_TAG}"
            }
        }

        stage('Deploy to GCP Instance') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: "${GCP_SSH_CRED}",
                        keyFileVariable: 'SSH_KEY'
                    ),
                    // FIX: pass Docker Hub credentials to remote host for authenticated pull
                    usernamePassword(
                        credentialsId: "${DOCKERHUB_CRED}",
                        usernameVariable: 'DH_USER',
                        passwordVariable: 'DH_PASS'
                    )
                ]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            -o ConnectTimeout=30 \
                            -i \$SSH_KEY \
                            ${GCP_USER}@${GCP_HOST} '
                                echo "'"$DH_PASS"'" | docker login -u "'"$DH_USER"'" --password-stdin
                                docker pull ${IMAGE_LATEST}
                                docker stop ${CONTAINER_NAME} 2>/dev/null || true
                                docker rm   ${CONTAINER_NAME} 2>/dev/null || true
                                docker run -d \
                                    --name ${CONTAINER_NAME} \
                                    --restart always \
                                    -p ${HOST_PORT}:${CONTAINER_PORT} \
                                    ${IMAGE_LATEST}
                                docker logout
                            '
                    """
                }
            }
        }
    }

    post {

        success {
            withCredentials([
                string(credentialsId: "${TELEGRAM_CRED}", variable: 'BOT_TOKEN'),
                string(credentialsId: "${TELEGRAM_CHAT}", variable: 'CHAT_ID')
            ]) {
                // FIX: kept single-quote shell block; Groovy vars are pre-expanded
                // via environment block so they are safe to reference here as shell vars
                sh '''
                    curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
                    -d chat_id="$CHAT_ID" \
                    -d parse_mode="Markdown" \
                    -d text="✅ *BUILD SUCCESS*
Job: $JOB_NAME
Build: #$BUILD_NUMBER
Image: $IMAGE_TAG
App: https://abc.sythorng.codes
URL: $BUILD_URL"
                '''
            }
        }

        failure {
            withCredentials([
                string(credentialsId: "${TELEGRAM_CRED}", variable: 'BOT_TOKEN'),
                string(credentialsId: "${TELEGRAM_CHAT}", variable: 'CHAT_ID')
            ]) {
                // FIX: moved Groovy vars into shell variables first to avoid
                // special-character injection breaking the curl payload
                sh """
                    JOB="${JOB_NAME}"
                    BUILD="${BUILD_NUMBER}"
                    URL="${BUILD_URL}"
                    MSG="❌ <b>BUILD FAILED</b>
Job: \$JOB
Build: #\$BUILD
Stage: Check console for details
URL: \$URL"

                    curl -s -X POST "https://api.telegram.org/bot\$BOT_TOKEN/sendMessage" \
                    --data-urlencode "chat_id=\$CHAT_ID" \
                    --data-urlencode "parse_mode=HTML" \
                    --data-urlencode "text=\$MSG"
                """
            }
        }

        always {
            node {
        sh "docker rmi ${env.IMAGE_TAG} ${env.IMAGE_LATEST} 2>/dev/null || true"
        }
    }
}