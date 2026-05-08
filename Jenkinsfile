pipeline {
    agent any

    environment {
        IMAGE_NAME    = "abc-notification-ui"
        DOCKER_HUB_ID = "sythorng"          // ← change this
        IMAGE_FULL    = "${DOCKER_HUB_ID}/${IMAGE_NAME}"
        IMAGE_TAG     = "${IMAGE_FULL}:${BUILD_NUMBER}"
        IMAGE_LATEST  = "${IMAGE_FULL}:latest"

        // Credentials IDs (configured in Jenkins — see setup guide below)
        DOCKERHUB_CRED  = "dockerhub-credentials"
        TELEGRAM_CRED   = "telegram-bot-token"
        TELEGRAM_CHAT   = "telegram-chat-id"
        GCP_SSH_CRED    = "gcp-ssh-key"
        GCP_HOST        = "34.87.89.201"           // ← change this
        GCP_USER        = "hostingdevop"              // ← change this (e.g. ubuntu)
        CONTAINER_NAME  = "abc-notification-ui"
        HOST_PORT       = "3000"
        CONTAINER_PORT  = "80"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo " Code checked out from GitHub"
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

        stage('Trivy Security Scan') {
            steps {
                sh """
                    trivy image --exit-code 1 \
                        --severity HIGH,CRITICAL \
                        --no-progress \
                        ${IMAGE_TAG}
                """
            }
            post {
                failure {
                    echo "❌ Trivy scan FAILED — critical vulnerabilities found"
                }
                success {
                    echo "Trivy scan passed"
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
                    sh """
                        echo "${DH_PASS}" | docker login -u "${DH_USER}" --password-stdin
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
                withCredentials([sshUserPrivateKey(
                    credentialsId: "${GCP_SSH_CRED}",
                    keyFileVariable: 'SSH_KEY'
                )]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no \
                            -i ${SSH_KEY} \
                            ${GCP_USER}@${GCP_HOST} '
                                docker pull ${IMAGE_LATEST}
                                docker stop ${CONTAINER_NAME} 2>/dev/null || true
                                docker rm   ${CONTAINER_NAME} 2>/dev/null || true
                                docker run -d \
                                    --name ${CONTAINER_NAME} \
                                    --restart always \
                                    -p ${HOST_PORT}:${CONTAINER_PORT} \
                                    ${IMAGE_LATEST}
                                echo "Container started: \$(docker ps --filter name=${CONTAINER_NAME} --format "{{.Status}}")"
                            '
                    """
                }
                echo " App deployed on GCP at port ${HOST_PORT}"
            }
        }
    }

    post {
        success {
            withCredentials([
                string(credentialsId: "${TELEGRAM_CRED}", variable: 'BOT_TOKEN'),
                string(credentialsId: "${TELEGRAM_CHAT}",  variable: 'CHAT_ID')
            ]) {
                sh """
                    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
                    -d chat_id="${CHAT_ID}" \
                    -d parse_mode="Markdown" \
                    -d text="*BUILD SUCCESS*
Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}
Image: ${IMAGE_TAG}
URL: ${BUILD_URL}"
                """
            }
        }
        failure {
            withCredentials([
                string(credentialsId: "${TELEGRAM_CRED}", variable: 'BOT_TOKEN'),
                string(credentialsId: "${TELEGRAM_CHAT}",  variable: 'CHAT_ID')
            ]) {
                sh """
                    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
                    -d chat_id="${CHAT_ID}" \
                    -d parse_mode="Markdown" \
                    -d text=" *BUILD FAILED*
Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}
Stage: Check console for details
URL: ${BUILD_URL}"
                """
            }
        }
        always {
            sh "docker rmi ${IMAGE_TAG} ${IMAGE_LATEST} 2>/dev/null || true"
            echo "🧹 Local images cleaned up"
        }
    }
}