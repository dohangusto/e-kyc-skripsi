# Load the restart_process extension
load('ext://restart_process', 'docker_build_with_restart')

### K8s Config ###

# Uncomment to use secrets
# k8s_yaml('./infra/development/k8s/secrets.yaml')

k8s_yaml('./infra/development/k8s/app-config.yaml')
k8s_yaml('./infra/development/k8s/database-postgres.yaml')
k8s_resource('database-postgres', labels="data", port_forwards=5432)
k8s_yaml('./infra/development/k8s/rabbitmq.yaml')
k8s_resource('rabbitmq', labels="data", port_forwards=[5672, 15672])

### End of K8s Config ###
### API Gateway ###

# Build the API Gateway binary from the cmd package (contains main.go)
gateway_compile_cmd = 'CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o build/api-gateway ./services/api-gateway/cmd'
if os.name == 'nt':
  gateway_compile_cmd = './infra/development/docker/api-gateway-build.bat'

local_resource(
  'api-gateway-compile',
  gateway_compile_cmd,
  deps=['./services/api-gateway', './shared'], labels="compiles")


docker_build_with_restart(
  'e-kyc/api-gateway',
  '.',
  entrypoint=['/app/build/api-gateway'],
  dockerfile='./infra/development/docker/api-gateway.Dockerfile',
  only=[
    './build/api-gateway',
    './shared',
  ],
  live_update=[
    sync('./build', '/app/build'),
    sync('./shared', '/app/shared'),
  ],
)

k8s_yaml('./infra/development/k8s/api-gateway-deployment.yaml')
k8s_resource('api-gateway', port_forwards=8080,
             resource_deps=['api-gateway-compile'], labels="services")
### End of API Gateway ###

### API Backoffice ###

backoffice_compile_cmd = 'CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o build/api-backoffice ./services/api-backoffice/cmd'
if os.name == 'nt':
  backoffice_compile_cmd = './infra/development/docker/api-backoffice-build.bat'

local_resource(
  'api-backoffice-compile',
  backoffice_compile_cmd,
  deps=['./services/api-backoffice', './shared'], labels="compiles")

docker_build_with_restart(
  'e-kyc/api-backoffice',
  '.',
  entrypoint=['/app/build/api-backoffice'],
  dockerfile='./infra/development/docker/api-backoffice.Dockerfile',
  only=[
    './build/api-backoffice',
    './shared',
  ],
  live_update=[
    sync('./build', '/app/build'),
    sync('./shared', '/app/shared'),
  ],
)

k8s_yaml('./infra/development/k8s/api-backoffice-deployment.yaml')
k8s_resource('api-backoffice', port_forwards=8081,
             resource_deps=['api-backoffice-compile'], labels="services")
### End of API Backoffice ###

### API AI Support ###

docker_build_with_restart(
  'e-kyc/api-ai-support',
  '.',
  entrypoint=['python', 'cmd/main.py'],
  dockerfile='./infra/development/docker/api-ai-support.Dockerfile',
  only=[
    './services/api-AI-support',
  ],
  live_update=[
    sync('./services/api-AI-support', '/app/services/api-AI-support'),
  ],
)

k8s_yaml('./infra/development/k8s/api-ai-support-deployment.yaml')
k8s_resource('api-ai-support', port_forwards=[50052, 8082], labels="services")
### End of API AI Support ###

### Web (React) ###

# Build the React dev image and run the dev server
docker_build_with_restart(
  'react-main/web',
  '.',
  dockerfile='./infra/development/docker/web.Dockerfile',
  only=[
    './web/react-main',
    './shared/dummies',
  ],
  live_update=[
    sync('./web/react-main', '/app'),
    sync('./shared/dummies', '/shared/dummies'),
  ],
  entrypoint=['sh','-lc','npm run dev -- --host 0.0.0.0 --port 3000']
)

k8s_yaml('./infra/development/k8s/web-deployment.yaml')
k8s_resource('web', port_forwards=3000, labels="web")
### End of Web (React) ###


### Web Backoffice (React) ###

docker_build_with_restart(
  'react-backoffice/web',
  '.',
  dockerfile='./infra/development/docker/web-backoffice.Dockerfile',
  only=[
    './web/react-backoffice',
    './shared/dummies',
  ],
  live_update=[
    sync('./web/react-backoffice', '/app'),
    sync('./shared/dummies', '/shared/dummies'),
  ],
  entrypoint=['sh','-lc','npm run dev -- --host 0.0.0.0 --port 3001']
)

k8s_yaml('./infra/development/k8s/web-backoffice-deployment.yaml')
k8s_resource('web-backoffice', port_forwards=3001, labels="web")
### End of Web Backoffice (React) ###
