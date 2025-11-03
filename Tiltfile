# Load the restart_process extension
load('ext://restart_process', 'docker_build_with_restart')

### K8s Config ###

# Uncomment to use secrets
# k8s_yaml('./infra/development/k8s/secrets.yaml')

k8s_yaml('./infra/development/k8s/app-config.yaml')

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

### Web (React) ###

# Build the React dev image and run the dev server
docker_build_with_restart(
  'react-main/web',
  '.',
  dockerfile='./infra/development/docker/web.Dockerfile',
  only=[
    './web/react-main',
  ],
  live_update=[
    sync('./web/react-main', '/app'),
  ],
  entrypoint=['sh','-lc','npm run dev -- --host 0.0.0.0 --port 3000']
)

k8s_yaml('./infra/development/k8s/web-deployment.yaml')
k8s_resource('web', port_forwards=3000, labels="web")
### End of Web (React) ###
