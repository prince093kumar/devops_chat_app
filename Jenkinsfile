pipeline {
    agent any
    
    triggers {
        pollSCM('H/5 * * * *') // Poll source code every 5 minutes for automatic redeployment
    }
    
    environment {
        REGISTRY = "ghcr.io"
        REGISTRY_CREDENTIALS_ID = "ghcr-credentials"
        COMPOSE_PROJECT_NAME = "microservices_chat"
    }
    
    stages {
        stage('🚚 Clone Repository') {
            steps {
                echo 'Cloning workspace...'
                checkout scm
            }
        }
        
        stage('🧪 Run Service Tests') {
            steps {
                echo 'Spinning up test suite inside temporary container...'
                // Disable MSYS path conversion on Windows to prevent docker path mangling
                sh 'MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)":/app -w /app/services/auth-service node:18-alpine sh -c "npm ci && npm test"'
            }
        }
        
        stage('📦 Rebuild Microservices') {
            steps {
                echo 'Building production container images...'
                sh 'docker-compose build --no-cache'
            }
        }
        
        stage('🛑 Teardown Old Replicas') {
            steps {
                echo 'Shutting down old chat infrastructure...'
                sh 'docker-compose down --remove-orphans'
            }
        }
        
        stage('🚀 Deploy Infrastructure') {
            steps {
                echo 'Deploying all containers in background mode...'
                sh 'docker-compose up -d'
            }
        }
        
        stage('🩺 Cluster Health Check') {
            steps {
                echo 'Initiating health probe on Central Gateway...'
                script {
                    int retries = 5
                    boolean healthy = false
                    while (retries > 0 && !healthy) {
                        try {
                            // Check if gateway returns healthy response (e.g. 500/404 or active)
                            sh 'curl -f http://localhost:5000/ || exit 1'
                            echo '✅ Central Gateway is online.'
                            healthy = true
                        } catch (Exception e) {
                            echo "⚠️ Probe failed. Central gateway initializing... Retrying in 10s (${retries} attempts left)"
                            sleep 10
                            retries--
                        }
                    }
                    if (!healthy) {
                        error '❌ Deployment failed: Cluster health checks timed out!'
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo '🎉 Real-Time Chat Workspace successfully redeployed and healthy!'
        }
        failure {
            echo '❌ Jenkins CI/CD Pipeline execution failed.'
        }
    }
}
