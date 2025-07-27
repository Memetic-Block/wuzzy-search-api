job "wuzzy-search-api-stage" {
  datacenters = [ "mb-hel" ]
  type = "service"

  constraint {
    attribute = "${meta.vm_max_map_count}"
    operator  = ">="
    value     = "262144"
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
        SEARCH_INDEX_NAME="permaweb-crawler"
        ES_USERNAME="elastic"
        ES_PASSWORD="changeme"
        # ES_CERT_PATH="../infra/certs/ca/ca.crt"
        # ES_USE_TLS="true"
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
