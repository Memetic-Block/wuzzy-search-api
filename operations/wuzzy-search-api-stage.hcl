job "wuzzy-search-api-stage" {
  datacenters = [ "mb-hel" ]
  type = "service"

  constraint {
    attribute = "${meta.env}"
    value     = "worker"
  }

  update {
    max_parallel      = 1
    health_check      = "checks"
    min_healthy_time  = "10s"
    healthy_deadline  = "5m"
    progress_deadline = "10m"
    auto_revert       = true
    auto_promote      = true
    canary            = 1
    stagger           = "30s"
  }

  group "wuzzy-search-api-stage-group" {
    count = 1

    network {
      mode = "bridge"
      port "http" {
        host_network = "wireguard"
      }
    }

    task "wuzzy-search-api-stage-task" {
      driver = "docker"

      config {
        image = "${CONTAINER_REGISTRY_ADDR}/memetic-block/wuzzy-search-api:${VERSION}"
      }

      env {
        VERSION="[[ .commit_sha ]]"
        PORT="${NOMAD_PORT_http}"
        SEARCH_INDEX_NAME="permaweb-crawler-2025-10-17"
        ES_USERNAME="admin"
      }

      template {
        data = <<-EOF
        {{- range service "wuzzy-opensearch-stage-hel-1" }}
        ES_HOST="http://{{ .Address }}:{{ .Port }}"
        {{- end }}
        {{- range service "container-registry" }}
        CONTAINER_REGISTRY_ADDR="{{ .Address }}:{{ .Port }}"
        {{- end }}
        EOF
        env = true
        destination = "local/config.env"
      }

      vault { policies = [ "wuzzy-opensearch-stage" ] }

      template {
        data = <<-EOF
        {{- with secret "kv/wuzzy/opensearch-stage" }}
        ES_PASSWORD="{{ .Data.data.OPENSEARCH_INITIAL_ADMIN_PASSWORD }}"
        {{- end }}
        EOF
        destination = "secrets/config.env"
        env = true
      }

      resources {
        cpu    = 1024
        memory = 1024
      }

      service {
        name = "wuzzy-search-api-stage"
        port = "http"

        check {
          type     = "http"
          path     = "/"
          interval = "10s"
          timeout  = "10s"
        }

        tags = [
          "traefik.enable=true",
          "traefik.http.middlewares.wuzzy-search-api-stage-corsheaders.headers.accesscontrolallowmethods=GET,OPTIONS,PUT,POST,DELETE,HEAD,PATCH",
          "traefik.http.middlewares.wuzzy-search-api-stage-corsheaders.headers.accesscontrolallowheaders=*",
          "traefik.http.middlewares.wuzzy-search-api-stage-corsheaders.headers.accesscontrolalloworiginlist=*",
          "traefik.http.middlewares.wuzzy-search-api-stage-corsheaders.headers.accesscontrolmaxage=100",
          "traefik.http.middlewares.wuzzy-search-api-stage-corsheaders.headers.addvaryheader=true",
          "traefik.http.routers.wuzzy-search-api-stage.entrypoints=https",
          "traefik.http.routers.wuzzy-search-api-stage.tls=true",
          "traefik.http.routers.wuzzy-search-api-stage.tls.certresolver=memetic-block",
          "traefik.http.routers.wuzzy-search-api-stage.rule=Host(`wuzzy-search-api-stage.hel.memeticblock.net`)"
        ]
      }
    }
  }
}
