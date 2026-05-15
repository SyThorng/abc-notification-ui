// pipeline {
//     agent any

//     environment {
//         IMAGE_NAME      = "abc-notification-ui"
//         DOCKER_HUB_ID   = "sythorng"
//         IMAGE_FULL      = "${DOCKER_HUB_ID}/${IMAGE_NAME}"
//         IMAGE_TAG       = "${IMAGE_FULL}:${BUILD_NUMBER}"
//         IMAGE_LATEST    = "${IMAGE_FULL}:latest"

//         DOCKERHUB_CRED  = "dockerhub-credentials"
//         TELEGRAM_CRED   = "telegram-bot-token"
//         TELEGRAM_CHAT   = "telegram-chat-id"
//         GCP_SSH_CRED    = "gcp-ssh-key"
//         GCP_HOST        = "34.1.199.84"
//         GCP_USER        = "hostingdevop"
//         CONTAINER_NAME  = "abc-notification-ui"
//         HOST_PORT       = "3000"
//         CONTAINER_PORT  = "80"
        
//         // SonarQube Configuration
//         SONARQUBE_HOST  = "https://sonar-qube.sythorng.online"
//         SONARQUBE_TOKEN = "sonarqube-token"
//         PROJECT_KEY     = "abc-notification-ui"
//     }

//     stages {

//         stage('Checkout') {
//             agent any
//             steps {
//                 echo "📥 Checking out code from GitHub..."
//                 checkout scm
//                 echo "✅ Code checked out successfully"
//             }
//         }

//         stage('Build Docker Image') {
//             // Run on Jenkins Slave for resource-intensive tasks
//             agent {
//                 node {
//                     label 'slave01'
//                     customWorkspace "/var/jenkins_home/workspace/${JOB_NAME}/${BUILD_NUMBER}"
//                 }
//             }
//             steps {
//                 echo "🐳 Building Docker image on slave01..."
//                 sh """
//                     docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} .
//                     echo "✅ Docker image built: ${IMAGE_TAG}"
//                     docker images | grep ${IMAGE_NAME}
//                 """
//             }
//         }

//         stage('SonarQube Code Analysis') {
//             // Run on Jenkins Slave for scanning
//             agent {
//                 node {
//                     label 'slave01'
//                 }
//             }
//             steps {
//                 echo "🔍 Running SonarQube analysis..."
//                 script {
//                     try {
//                         withSonarQubeEnv('SonarQube') {
//                             sh '''
//                                 # Run SonarQube scanner with code analysis
//                                 sonar-scanner \
//                                     -Dsonar.projectKey=${PROJECT_KEY} \
//                                     -Dsonar.sources=src \
//                                     -Dsonar.host.url=${SONARQUBE_HOST} \
//                                     -Dsonar.login=${SONARQUBE_TOKEN} \
//                                     -Dsonar.qualitygate.wait=true
//                             '''
//                         }
//                         echo "✅ SonarQube analysis completed successfully"
//                     } catch (Exception e) {
//                         echo "❌ SonarQube analysis failed: ${e.message}"
//                         currentBuild.result = 'FAILURE'
//                         throw e
//                     }
//                 }
//             }
//         }

//         stage('Quality Gate Check') {
//             // Run on Jenkins Slave to check SonarQube quality gate
//             agent {
//                 node {
//                     label 'slave01'
//                 }
//             }
//             steps {
//                 echo "⚖️  Checking SonarQube Quality Gate..."
//                 script {
//                     try {
//                         withSonarQubeEnv('SonarQube') {
//                             sh '''
//                                 # Wait for quality gate result
//                                 MAX_WAIT=300
//                                 ELAPSED=0
//                                 QUALITY_GATE="NONE"
                                
//                                 while [ "$QUALITY_GATE" = "NONE" ] && [ $ELAPSED -lt $MAX_WAIT ]; do
//                                     RESPONSE=$(curl -s -u ${SONARQUBE_TOKEN}: \
//                                         "${SONARQUBE_HOST}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}")
//                                     QUALITY_GATE=$(echo $RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
                                    
//                                     if [ "$QUALITY_GATE" != "NONE" ]; then
//                                         break
//                                     fi
                                    
//                                     sleep 5
//                                     ELAPSED=$((ELAPSED + 5))
//                                 done
                                
//                                 echo "Quality Gate Status: $QUALITY_GATE"
                                
//                                 if [ "$QUALITY_GATE" = "OK" ]; then
//                                     echo "✅ Quality Gate PASSED"
//                                     exit 0
//                                 else
//                                     echo "❌ Quality Gate FAILED"
//                                     exit 1
//                                 fi
//                             '''
//                         }
//                     } catch (Exception e) {
//                         echo "❌ Quality Gate check failed"
//                         currentBuild.result = 'FAILURE'
//                         throw e
//                     }
//                 }
//             }
//         }

//         stage('Push to Docker Hub') {
//             // Push from Slave back to Docker registry
//             agent {
//                 node {
//                     label 'slave01'
//                 }
//             }
//             steps {
//                 echo "📤 Pushing image to Docker Hub..."
//                 withCredentials([usernamePassword(
//                     credentialsId: "${DOCKERHUB_CRED}",
//                     usernameVariable: 'DH_USER',
//                     passwordVariable: 'DH_PASS'
//                 )]) {
//                     sh '''
//                         echo "Logging into Docker Hub..."
//                         echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        
//                         echo "Pushing image tags..."
//                         docker push $IMAGE_TAG
//                         docker push $IMAGE_LATEST
                        
//                         echo "Logging out..."
//                         docker logout
                        
//                         echo "✅ Image pushed successfully"
//                     '''
//                 }
//             }
//         }

//         stage('Deploy to GCP Instance') {
//             // Deploy can run on master (SSH doesn't need local Docker)
//             agent any
//             steps {
//                 echo "🚀 Deploying to GCP Instance..."
//                 withCredentials([sshUserPrivateKey(
//                     credentialsId: "${GCP_SSH_CRED}",
//                     keyFileVariable: 'SSH_KEY'
//                 )]) {
//                     sh """
//                         echo "Connecting to GCP host: ${GCP_HOST}"
//                         ssh -o StrictHostKeyChecking=no \
//                             -o ConnectTimeout=30 \
//                             -i \$SSH_KEY \
//                             ${GCP_USER}@${GCP_HOST} '
//                                 echo "Pulling latest image..."
//                                 docker pull ${IMAGE_LATEST}
                                
//                                 echo "Stopping old container..."
//                                 docker stop ${CONTAINER_NAME} 2>/dev/null || true
//                                 docker rm ${CONTAINER_NAME} 2>/dev/null || true
                                
//                                 echo "Starting new container..."
//                                 docker run -d \
//                                     --name ${CONTAINER_NAME} \
//                                     --restart always \
//                                     -p ${HOST_PORT}:${CONTAINER_PORT} \
//                                     ${IMAGE_LATEST}
                                
//                                 echo "Container status:"
//                                 docker ps | grep ${CONTAINER_NAME}
//                             '
//                     """
//                 }
//                 echo "✅ Deployment completed"
//             }
//         }
//     }

//     post {
//         success {
//             echo "✅ Pipeline execution SUCCESS"
//             // Send success notification via Telegram
//             withCredentials([
//                 string(credentialsId: "${TELEGRAM_CRED}", variable: 'BOT_TOKEN'),
//                 string(credentialsId: "${TELEGRAM_CHAT}",  variable: 'CHAT_ID')
//             ]) {
//                 sh '''
//                     TELEGRAM_MESSAGE="✅ *BUILD & DEPLOYMENT SUCCESS*
// 📋 Job: $JOB_NAME
// 🔢 Build: #$BUILD_NUMBER
// 🐳 Image: $IMAGE_TAG
// 🌐 App: https://abc-app.sythorng.online
// 🔗 Jenkins URL: $BUILD_URL
// ⏱️ Duration: $BUILD_DURATION ms"

//                     curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
//                     -d chat_id="$CHAT_ID" \
//                     -d parse_mode="Markdown" \
//                     -d text="$TELEGRAM_MESSAGE"
                    
//                     echo "📢 Success notification sent to Telegram"
//                 '''
//             }
//         }

//         failure {
//             echo "❌ Pipeline execution FAILED"
//             // Send failure notification via Telegram
//             withCredentials([
//                 string(credentialsId: "${TELEGRAM_CRED}", variable: 'BOT_TOKEN'),
//                 string(credentialsId: "${TELEGRAM_CHAT}",  variable: 'CHAT_ID')
//             ]) {
//                 sh '''
//                     TELEGRAM_MESSAGE="❌ *BUILD OR DEPLOYMENT FAILED*
// 📋 Job: $JOB_NAME
// 🔢 Build: #$BUILD_NUMBER
// ⚠️ Check console for details
// 🔗 Jenkins URL: $BUILD_URL
// 📊 Common reasons:
//    • SonarQube Quality Gate failed
//    • Docker image build failed
//    • SSH deployment failed
//    • Docker Hub push failed"

//                     curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
//                     --data-urlencode "chat_id=$CHAT_ID" \
//                     --data-urlencode "parse_mode=Markdown" \
//                     --data-urlencode "text=$TELEGRAM_MESSAGE"
                    
//                     echo "📢 Failure notification sent to Telegram"
//                 '''
//             }
//         }

//         always {
//             echo "🧹 Cleaning up resources on slave01..."
//             // Clean up on slave
//             node('slave01') {
//                 sh """
//                     echo "Removing local Docker images..."
//                     docker rmi ${IMAGE_TAG} ${IMAGE_LATEST} 2>/dev/null || true
//                     docker system prune -f 2>/dev/null || true
//                     echo "✅ Cleanup completed"
//                 """
//             }
            
//             // Archive logs and reports
//             echo "📁 Archiving build artifacts..."
//             archiveArtifacts artifacts: '**/target/**.jar,**/**.log', 
//                              allowEmptyArchive: true
//         }
//     }
// }



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
        GCP_HOST        = "34.1.199.84"
        GCP_USER        = "hostingdevop"
        CONTAINER_NAME  = "abc-notification-ui"
        HOST_PORT       = "3000"
        CONTAINER_PORT  = "80"
        SONAR_SCANNER_HOME = tool 'SonarQube Scanner'

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
                echo " Docker image built: ${IMAGE_TAG}"
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
                        -Dsonar.exclusions=**/node_modules/**,**/*.test.js
                    """
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
                    sh '''
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        docker push $IMAGE_TAG
                        docker push $IMAGE_LATEST
                        docker logout
                    '''
                }
                echo " Image pushed: ${IMAGE_TAG}"
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
                                -o ConnectTimeout=30 \
                                -i \$SSH_KEY \
                                ${GCP_USER}@${GCP_HOST} '
                                    docker pull ${IMAGE_LATEST}
                                    docker stop ${CONTAINER_NAME} 2>/dev/null || true
                                    docker rm   ${CONTAINER_NAME} 2>/dev/null || true
                                    docker run -d \
                                        --name ${CONTAINER_NAME} \
                                        --restart always \
                                        -p ${HOST_PORT}:${CONTAINER_PORT} \
                                        ${IMAGE_LATEST}
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
            sh """
MSG="❌ <b>BUILD FAILED</b>
Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}
Stage: Check console for details
URL: ${BUILD_URL}"

curl -s -X POST "https://api.telegram.org/bot\$BOT_TOKEN/sendMessage" \
--data-urlencode "chat_id=\$CHAT_ID" \
--data-urlencode "parse_mode=HTML" \
--data-urlencode "text=\$MSG"
            """
        }
    }

    always {
        sh "docker rmi ${IMAGE_TAG} ${IMAGE_LATEST} 2>/dev/null || true"
        echo "🧹 Local images cleaned up"
    }
}
}