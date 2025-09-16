#!/bin/sh

if ! [ $(id -u) = 0 ]; then
   echo "Must run as sudo or root"
   exit 1
fi

sudo docker service update alacran-alacran --force
sleep 2s
sudo docker service logs alacran-alacran --follow --since 2m
