if ! screen -list | grep -q "TestDota2PatchBot"; then
    bash ./stop.sh
fi

while true
do
  npm start
done
