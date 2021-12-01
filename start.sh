if ! screen -list | grep -q "Dota2PatchBot"; then
    bash ./stop.sh
fi

while true
do
  npm start
done
