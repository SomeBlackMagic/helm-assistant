#!/bin/bash
trap trap_exit SIGINT
trap trap_exit  SIGQUIT
trap trap_exit SIGTSTP

trap_exit() {
   echo "trap signal: sleep 3 and exit"
   sleep 3
   echo "Bye..."
   exit ${APP_TRAP_EXIT_CODE:-0}
}

echo "---------------------------------"
echo "         MAIN PROCESS            "
echo "---------------------------------"

count=0
while [ $count -lt ${APP_WHILE_COUNT:-100} ]
do
  (( count++ ))
  sleep ${APP_SLEEP_TIME:-1}
  echo "I: ${count}"
  if [ ${count} -eq 10 ]; then
      touch /var/lock/ready.lock
      echo "Add ready.lock"
  fi
done

exit ${APP_EXIT_CODE:-0}