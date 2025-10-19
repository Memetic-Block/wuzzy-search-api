job "wuzzy-search-api-dev" {
  datacenters = [ "mb-hel" ]
  type = "service"

  constraint {
    attribute = "${meta.env}"
    value     = "edge-worker"
  }

  group "wuzzy-search-api-dev-group" {
    count = 1

    network {
      mode = "bridge"
      port "http" {
        host_network = "wireguard"
      }
    }

    task "wuzzy-search-api-dev-task" {
      driver = "docker"

      config {
        image = "${CONTAINER_REGISTRY_ADDR}/memetic-block/wuzzy-search-api:${VERSION}"
      }

      env {
        VERSION="[[ .commit_sha ]]"
        PORT="${NOMAD_PORT_http}"
        SEARCH_INDEX_NAME="permaweb-crawler-test-10-15-2025"
        ES_USERNAME="elastic"
        ES_PASSWORD="changeme"
        # ES_CERT_PATH="../infra/certs/ca/ca.crt"
        # ES_USE_TLS="true"
        # CORS_DOMAINS="https://wuzzy-stage.hel.memeticblock.net"
      }

      template {
        data = <<-EOF
        {{- range service "wuzzy-elasticsearch-stage" }}
        ES_HOST="http://{{ .Address }}:{{ .Port }}"
        {{- end }}
        {{- range service "container-registry" }}
        CONTAINER_REGISTRY_ADDR="{{ .Address }}:{{ .Port }}"
        {{- end }}
        EOF
        env = true
        destination = "local/config.env"
      }

      resources {
        cpu    = 1024
        memory = 1024
      }

      service {
        name = "wuzzy-search-api-dev"
        port = "http"

        check {
          type     = "http"
          path     = "/"
          interval = "10s"
          timeout  = "10s"
        }

        tags = [
          "traefik.enable=true",
          "traefik.http.middlewares.wuzzy-search-api-dev-corsheaders.headers.accesscontrolallowmethods=GET,OPTIONS,PUT,POST,DELETE,HEAD,PATCH",
          "traefik.http.middlewares.wuzzy-search-api-dev-corsheaders.headers.accesscontrolallowheaders=*",
          "traefik.http.middlewares.wuzzy-search-api-dev-corsheaders.headers.accesscontrolalloworiginlist=*",
          "traefik.http.middlewares.wuzzy-search-api-dev-corsheaders.headers.accesscontrolmaxage=100",
          "traefik.http.middlewares.wuzzy-search-api-dev-corsheaders.headers.addvaryheader=true",
          "traefik.http.routers.wuzzy-search-api-dev.entrypoints=https",
          "traefik.http.routers.wuzzy-search-api-dev.tls=true",
          "traefik.http.routers.wuzzy-search-api-dev.tls.certresolver=memetic-block",
          "traefik.http.routers.wuzzy-search-api-dev.rule=Host(`wuzzy-search-api-dev.hel.memeticblock.net`)"
        ]
      }
    }
  }
}
