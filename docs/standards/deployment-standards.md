# Deployment Standards

## 🎯 Overview

This document defines comprehensive deployment standards for SlotWise, ensuring consistent, reliable, and secure deployment processes across all environments and services.

## 🏗️ Core Principles

### 1. Infrastructure as Code
- All infrastructure defined in version-controlled code
- Reproducible environments across dev, staging, and production
- Automated provisioning and configuration management
- Immutable infrastructure patterns

### 2. Continuous Deployment
- Automated testing and deployment pipelines
- Fast, reliable, and repeatable deployments
- Rollback capabilities for quick recovery
- Blue-green or canary deployment strategies

### 3. Environment Parity
- Consistent environments across all stages
- Minimal configuration differences between environments
- Standardized deployment processes
- Predictable behavior across environments

## 🌍 Environment Strategy

### 1. Environment Hierarchy
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ • Local dev     │───▶│ • Pre-prod      │───▶│ • Live system   │
│ • Feature tests │    │ • Integration   │    │ • Real users    │
│ • Rapid changes│    │ • Performance   │    │ • High SLA      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ • Docker local  │    │ • Kubernetes    │    │ • Kubernetes    │
│ • SQLite/Postgres│    │ • PostgreSQL    │    │ • PostgreSQL    │
│ • Mock services │    │ • Real services │    │ • Real services │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2. Environment Configuration
```yaml
# environments/development.yaml
environment: development
replicas: 1
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
database:
  host: postgres-dev.slotwise.internal
  name: slotwise_dev
autoscaling:
  enabled: false

# environments/staging.yaml
environment: staging
replicas: 2
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
database:
  host: postgres-staging.slotwise.internal
  name: slotwise_staging
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5

# environments/production.yaml
environment: production
replicas: 3
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
database:
  host: postgres-prod.slotwise.internal
  name: slotwise_prod
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
```

## 🐳 Containerization Standards

### 1. Dockerfile Standards
```dockerfile
# Multi-stage build for Go services
FROM golang:1.21-alpine AS builder

# Install dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags='-w -s -extldflags "-static"' \
    -o main ./cmd/server

# Final stage
FROM scratch

# Copy certificates and timezone data
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /app/main /main

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/main", "healthcheck"]

# Run the binary
ENTRYPOINT ["/main"]
```

### 2. Container Security
```dockerfile
# Security best practices
FROM golang:1.21-alpine AS builder

# Create non-root user
RUN adduser -D -s /bin/sh appuser

# ... build steps ...

FROM scratch
# Copy user from builder
COPY --from=builder /etc/passwd /etc/passwd

# Copy application
COPY --from=builder /app/main /main

# Use non-root user
USER appuser

# Read-only root filesystem
# (configured in Kubernetes deployment)
```

### 3. Image Tagging Strategy
```bash
# Tagging convention
docker build -t slotwise/auth-service:latest .
docker build -t slotwise/auth-service:v1.2.3 .
docker build -t slotwise/auth-service:sha-abc123def .

# Environment-specific tags
docker tag slotwise/auth-service:v1.2.3 slotwise/auth-service:staging
docker tag slotwise/auth-service:v1.2.3 slotwise/auth-service:production
```

## ☸️ Kubernetes Deployment

### 1. Deployment Manifests
```yaml
# k8s/auth-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: slotwise
  labels:
    app: auth-service
    version: v1.2.3
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
        version: v1.2.3
    spec:
      serviceAccountName: auth-service
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: auth-service
        image: slotwise/auth-service:v1.2.3
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: auth-service-secrets
              key: database-password
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: tmp
        emptyDir: {}
      - name: config
        configMap:
          name: auth-service-config
```

### 2. Service and Ingress
```yaml
# k8s/auth-service/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: slotwise
spec:
  selector:
    app: auth-service
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090

---
# k8s/auth-service/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auth-service
  namespace: slotwise
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.slotwise.com
    secretName: slotwise-tls
  rules:
  - host: api.slotwise.com
    http:
      paths:
      - path: /api/v1/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
```

### 3. ConfigMaps and Secrets
```yaml
# k8s/auth-service/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-service-config
  namespace: slotwise
data:
  config.yaml: |
    server:
      port: 8080
    database:
      host: postgres.slotwise.internal
      port: 5432
      name: slotwise_auth
    logging:
      level: info
      format: json

---
# k8s/auth-service/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-service-secrets
  namespace: slotwise
type: Opaque
data:
  database-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-secret>
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: slotwise

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v4
      with:
        go-version: '1.21'
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: |
        npx nx affected --target=test --parallel=3
        npx nx affected --target=lint --parallel=3
    
    - name: Build applications
      run: npx nx affected --target=build --parallel=3

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        service: [auth-service, business-service, scheduling-service]
    steps:
    - uses: actions/checkout@v4
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        file: apps/${{ matrix.service }}/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}
    
    - name: Deploy to staging
      run: |
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/staging/
        kubectl rollout status deployment/auth-service -n slotwise-staging
    
    - name: Run smoke tests
      run: |
        npm run test:smoke -- --env=staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG_PRODUCTION }}
    
    - name: Deploy to production
      run: |
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/production/
        kubectl rollout status deployment/auth-service -n slotwise-production
    
    - name: Run health checks
      run: |
        npm run test:health -- --env=production
```

### 2. Deployment Strategies

#### **Rolling Update (Default)**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

#### **Blue-Green Deployment**
```bash
# Blue-Green deployment script
#!/bin/bash
set -e

NAMESPACE="slotwise-production"
SERVICE="auth-service"
NEW_VERSION="v1.2.3"

# Deploy new version (green)
kubectl apply -f k8s/production/${SERVICE}-green.yaml

# Wait for green deployment to be ready
kubectl rollout status deployment/${SERVICE}-green -n $NAMESPACE

# Run health checks on green deployment
./scripts/health-check.sh green

# Switch traffic to green
kubectl patch service $SERVICE -n $NAMESPACE -p '{"spec":{"selector":{"version":"'$NEW_VERSION'"}}}'

# Verify traffic switch
./scripts/verify-traffic.sh

# Clean up blue deployment
kubectl delete deployment ${SERVICE}-blue -n $NAMESPACE
```

#### **Canary Deployment**
```yaml
# Canary deployment with Istio
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: auth-service
        subset: canary
  - route:
    - destination:
        host: auth-service
        subset: stable
      weight: 90
    - destination:
        host: auth-service
        subset: canary
      weight: 10
```

## 📊 Monitoring and Observability

### 1. Health Checks
```go
// Health check implementation
func (h *HealthHandler) HealthCheck(c *gin.Context) {
    status := "healthy"
    checks := map[string]interface{}{
        "database": h.checkDatabase(),
        "redis":    h.checkRedis(),
        "nats":     h.checkNATS(),
        "version":  h.getVersion(),
        "uptime":   h.getUptime(),
    }
    
    for _, check := range checks {
        if check == "unhealthy" {
            status = "unhealthy"
            c.JSON(503, gin.H{
                "status": status,
                "checks": checks,
            })
            return
        }
    }
    
    c.JSON(200, gin.H{
        "status": status,
        "checks": checks,
    })
}
```

### 2. Metrics Collection
```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: auth-service
  namespace: slotwise
spec:
  selector:
    matchLabels:
      app: auth-service
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### 3. Logging Configuration
```yaml
# Fluent Bit configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
    
    [INPUT]
        Name              tail
        Path              /var/log/containers/*auth-service*.log
        Parser            docker
        Tag               auth-service.*
        Refresh_Interval  5
    
    [OUTPUT]
        Name  es
        Match auth-service.*
        Host  elasticsearch.logging.svc.cluster.local
        Port  9200
        Index slotwise-logs
```

## 🔒 Security Standards

### 1. Container Security
```yaml
# Pod Security Standards
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: auth-service
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

### 2. Network Policies
```yaml
# Network policy for auth service
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auth-service-netpol
  namespace: slotwise
spec:
  podSelector:
    matchLabels:
      app: auth-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing in CI
- [ ] Security scans completed
- [ ] Performance tests passed
- [ ] Database migrations tested
- [ ] Configuration reviewed
- [ ] Rollback plan prepared

### During Deployment
- [ ] Monitor deployment progress
- [ ] Verify health checks
- [ ] Check application logs
- [ ] Validate metrics
- [ ] Test critical functionality
- [ ] Monitor error rates

### Post-Deployment
- [ ] Verify all services healthy
- [ ] Check end-to-end functionality
- [ ] Monitor performance metrics
- [ ] Validate user experience
- [ ] Update documentation
- [ ] Notify stakeholders

## 🚨 Incident Response

### 1. Rollback Procedures
```bash
# Quick rollback script
#!/bin/bash
NAMESPACE="slotwise-production"
SERVICE="auth-service"
PREVIOUS_VERSION=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')

echo "Rolling back $SERVICE to revision $((PREVIOUS_VERSION-1))"
kubectl rollout undo deployment/$SERVICE -n $NAMESPACE
kubectl rollout status deployment/$SERVICE -n $NAMESPACE

echo "Rollback completed. Running health checks..."
./scripts/health-check.sh production
```

### 2. Emergency Procedures
```markdown
## Emergency Response Playbook

### Severity 1 (Critical)
1. **Immediate**: Rollback to last known good version
2. **Alert**: Notify on-call engineer and team lead
3. **Communicate**: Update status page and stakeholders
4. **Investigate**: Begin root cause analysis
5. **Document**: Record incident details and timeline

### Severity 2 (High)
1. **Assess**: Determine impact and urgency
2. **Plan**: Develop fix or rollback strategy
3. **Execute**: Implement solution with monitoring
4. **Verify**: Confirm resolution
5. **Follow-up**: Post-incident review
```

## 📚 Resources and Tools

### Infrastructure Tools
- **Kubernetes**: Container orchestration
- **Helm**: Package manager for Kubernetes
- **Terraform**: Infrastructure as code
- **ArgoCD**: GitOps continuous delivery

### Monitoring Tools
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Jaeger**: Distributed tracing
- **ELK Stack**: Logging and analysis

### Security Tools
- **Trivy**: Vulnerability scanning
- **Falco**: Runtime security monitoring
- **OPA Gatekeeper**: Policy enforcement
- **cert-manager**: Certificate management
