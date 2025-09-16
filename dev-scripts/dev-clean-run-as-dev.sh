#!/bin/sh

if ! [ $(id -u) = 0 ]; then
   echo "Must run as sudo or root"
   exit 1
fi

pwd >currentdirectory
docker service rm $(docker service ls -q)
sleep 1s
docker secret rm alacran-salt
docker build -t alacran-debug -f dockerfile-alacran.debug .
rm -rf /alacran && mkdir /alacran
mkdir -p /alacran/data/shared-logs
chmod -R 777 /alacran

docker run \
   -e "ALACRAN_IS_DEBUG=1" \
   -e "MAIN_NODE_IP_ADDRESS=127.0.0.1" \
   -v /var/run/docker.sock:/var/run/docker.sock \
   -v /alacran:/alacran \
   -v $(pwd):/usr/src/app alacran-debug

# -e "ALACRAN_HOST_HTTP_PORT=10083" \
# -e "ALACRAN_HOST_HTTPS_PORT=10443" \
# -e "ALACRAN_HOST_ADMIN_PORT=13000" \

sleep 2s
docker service logs alacran-alacran --follow
