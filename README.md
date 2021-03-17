# jobcan-overtime

This script outputs how much overtime work this month for jobcan.

[jobcan-checker-script](https://github.com/daido1976/jobcan-checker-script) already exists, but I rewrote it to support the new UI of jobcan.

See. https://all.jobcan.ne.jp/info/news/2390/

## Usage

```sh
$ cp .envrc.skeleton .envrc # And set environment variables.

$ npm run start # 出勤日当日の午後以降に確認する場合
$ npm run start:holiday # 出勤日当日の朝や休日などに確認する場合
```
