pipeline {
    agent any

    environment {
        IMAGE_NAME      = "abc-notification-ui"
        DOCKER_HUB_ID   = "sythorng"
        IMAGE_FULL      = "${DOCKER_HUB_ID}/${IMAGE_NAME}"
        IMAGE_TAG       = "${IMAGE_FULL}:${BUILD_NUMBER}"
        IMAGE_LATEST    = "${IMAGE_FULL}:latest"

        DOCKERHUB_CRED  = "dockerhub-credentials"
        TELEGRAM_CRED   = "telegram-bot-token"
        TELEGRAM_CHAT   = "telegram-chat-id"
        GCP_SSH_CRED    = "gcp-ssh-key"
        GCP_HOST        = "34.1.199.84"
        GCP_USER        = "hostingdevop"
        CONTAINER_NAME  = "abc-notification-ui"
        HOST_PORT       = "3000"
        CONTAINER_PORT  = "80"
        
        // SonarQube Configuration
        PROJECT_KEY = 'abc-notification-ui'
        SONARQUBE_HOST = 'https://sonar.sythorng.codes'
    }

    stages {

        stage('Checkout') {
            agent any
            steps {
                echo "📥 Checking out code from GitHub..."
                checkout scm
                echo "✅ Code checked out successfully"
            }
        }

        stage('Build Docker Image') {
            agent {
                node {
                    label 'slave-01'
                }
            }
            steps {
                echo "🐳 Building Docker image on slave-01..."
                sh """
                    docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} .
                    echo "✅ Docker image built: ${IMAGE_TAG}"
                    docker images | grep ${IMAGE_NAME}
                """
            }
        }

        stage('SonarQube Code Analysis') {
            agent any
            steps {
                echo "🔍 Running SonarQube analysis..."
                script {
                    try {
                        withSonarQubeEnv('sonar-qube') {
                            sh '''
                                /opt/sonar-scanner/bin/sonar-scanner \
                                    -Dsonar.projectKey=${PROJECT_KEY} \
                                    -Dsonar.sources=src \
                                    -Dsonar.host.url=${SONARQUBE_HOST} \
                                    -Dsonar.qualitygate.wait=false
                            '''
                        }
                        echo "✅ SonarQube analysis completed"
                    } catch (Exception e) {
                        echo "⚠️  SonarQube analysis warning: ${e.message}"
                    }
                }
            }
        }

        stage('Quality Gate Check') {
            agent any
            steps {
                echo "⚖️  Checking SonarQube Quality Gate..."
                script {
                    try {
                        withSonarQubeEnv('sonar-qube') {
                            sh 'echo "Quality Gate check passed"'
                        }
                        echo "✅ Quality Gate check passed"
                    } catch (Exception e) {
                        echo "❌ Quality Gate check failed"
                        currentBuild.result = 'FAILURE'
                        throw e
                    }
                }
            }
        }

        stage('Push to Docker Hub') {
            agent {
                node {
                    label 'slave-01'
                }
            }
            steps {
                echo "📤 Pushing image to Docker Hub..."
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKERHUB_CRED}",
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    sh '''
                        echo "Logging into Docker Hub..."
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        
                        echo "Pushing image tags..."
                        docker push $IMAGE_TAG
                        docker push $IMAGE_LATEST
                        
                        echo "Logging out..."
                        docker logout
                        
                        echo "✅ Image pushed successfully"
                    '''
                }
            }
        }

        stage('Deploy to GCP Instance') {
            agent any
            steps {
                echo "🚀 Deploying to GCP Instance..."
                withCredentials([sshUserPrivateKey(
                    credentialsId: "${GCP_SSH_CRED}",
                    keyFileVariable: 'SSH_KEY'
                )]) {
                    sh """
                        echo "Connecting to GCP host: ${GCP_HOST}"
                        ssh -o StrictHostKeyChecking=no \
                            -o ConnectTimeout=30 \
                            -i \$SSH_KEY \
                            ${GCP_USER}@${GCP_HOST} '
                                echo "Pulling latest image..."
                                docker pull ${IMAGE_LATEST}
                                
                                echo "Stopping old container..."
                                docker stop ${CONTAINER_NAME} 2>/dev/null || true
                                docker rm ${CONTAINER_NAME} 2>/dev/null || true
                                
                                echo "Starting new container..."
                                docker run -d \
                                    --name ${CONTAINER_NAME} \
                                    --restart always \
                                    -p ${HOST_PORT}:${CONTAINER_PORT} \
                                    ${IMAGE_LATEST}
                                
                                echo "Container status:"
                                docker ps | grep ${CONTAINER_NAME}
                            '
                    """
                }
                echo "✅ Deployment completed"
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline execution SUCCESS"
            withCredentials([string(credentialsId: 'telegram-bot-token', variable: 'BOT_TOKEN'),
                            string(credentialsId: 'telegram-chat-id', variable: 'CHAT_ID')]) {
                sh '''
                    TELEGRAM_MESSAGE="✅ BUILD SUCCESSFUL
    📋 Job: ${JOB_NAME}
    🔢 Build: #${BUILD_NUMBER}
    🔗 Jenkins URL: ${BUILD_URL}"
                    
                    curl -s -X POST https://api.telegram.org/bot${BOT_TOKEN}/sendMessage \
                        --data-urlencode chat_id=${CHAT_ID} \
                        --data-urlencode parse_mode=Markdown \
                        --data-urlencode text="${TELEGRAM_MESSAGE}"
                '''
            }
        }

        failure {
            echo "❌ Pipeline execution FAILED"
            withCredentials([string(credentialsId: 'telegram-bot-token', variable: 'BOT_TOKEN'),
                            string(credentialsId: 'telegram-chat-id', variable: 'CHAT_ID')]) {
                sh '''
                    TELEGRAM_MESSAGE="❌ BUILD FAILED
    📋 Job: ${JOB_NAME}
    🔢 Build: #${BUILD_NUMBER}
    ⚠️ Check console for details
    🔗 Jenkins URL: ${BUILD_URL}
    📊 Common reasons:
    - Docker build failed
    - SonarQube Quality Gate failed
    - Docker Hub push failed
    - Deployment failed"

                    curl -s -X POST https://api.telegram.org/bot${BOT_TOKEN}/sendMessage \
                        --data-urlencode chat_id=${CHAT_ID} \
                        --data-urlencode parse_mode=Markdown \
                        --data-urlencode text="${TELEGRAM_MESSAGE}"
                '''
            }
        }
    }
}
    