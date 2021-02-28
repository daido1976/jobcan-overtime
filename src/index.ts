import puppeteer from "puppeteer";

// main
(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const newPage = await browser.newPage();
  const loggedInPage = await login(newPage);
  const attendancePage = await visitAttendancePage(browser, loggedInPage);
  const workedHours = await fetchWorkedHours(attendancePage);
  const workedDays = await fetchWorkedDays(attendancePage);
  const overtimeHours = calcOvertimeHours(workedHours, workedDays);
  const overtime = format(overtimeHours);
  print(overtime);

  await browser.close();
})();

// ログイン処理
const login = async (page: puppeteer.Page): Promise<puppeteer.Page> => {
  await page.goto("https://id.jobcan.jp/users/sign_in");
  await page.type("#user_email", process.env.MY_EMAIL);
  await page.type("#user_password", process.env.MY_PASSWORD);
  await Promise.all([
    page.waitForNavigation(),
    page.click("#new_user > input.form__login"),
  ]);
  return page;
};

// 「出勤簿」ページにアクセスする
const visitAttendancePage = async (
  browser: puppeteer.Browser,
  page: puppeteer.Page
): Promise<puppeteer.Page> => {
  // 「勤怠」リンクをクリック（新しいタブが開く）
  await page.click("#jbc-app-links > ul > li:nth-child(2) > a");
  await page.waitForTimeout(3000);

  // 新しいタブに遷移
  const pages = await browser.pages();
  const lastPage = pages[pages.length - 1];
  await lastPage.bringToFront();

  // 「出勤簿」リンクをクリック
  await Promise.all([
    lastPage.waitForNavigation(),
    lastPage.click("#sidemenu > div.flex-shrink-0 > div > a:nth-child(1)"),
  ]);
  return lastPage;
};

// 「実労働時間」を取得して、あとで計算しやすいように数値型に変換する（e.g. "33:04" -> 33.06666666666667）
const fetchWorkedHours = async (
  attendancePage: puppeteer.Page
): Promise<number> => {
  // 実労働時間（e.g. "33:04"）
  const workedTimeStr = await attendancePage.$eval(
    "#search-result > div.row > div:nth-child(3) > div > div.card-body > table > tbody > tr:nth-child(1) > td > span",
    (el) => el.textContent
  );

  const [hours, minutes] = workedTimeStr.split(":");
  return parseFloat(hours) + parseFloat(minutes) / 60;
};

// 「実働日数」を取得して、あとで計算しやすいように数値型に変換する（e.g. "4" -> 4）
const fetchWorkedDays = async (
  attendancePage: puppeteer.Page
): Promise<number> => {
  // 実働日数（e.g. "4"）
  const workedDaysStr = await attendancePage.$eval(
    "#search-result > div.row > div:nth-child(2) > div > div.card-body > table > tbody > tr:nth-child(1) > td > span",
    (el) => el.textContent
  );

  return parseInt(workedDaysStr);
};

// 残業時間を計算する（e.g. 33.06666666666667, 4 -> 1.06666666666667）
const calcOvertimeHours = (workedHours: number, workedDays: number): number => {
  const regularWorkingHours = 8.0;
  // return process.argv[process.argv.length - 1] !== "--holiday"
  //   ? workedHours - workedDays * regularWorkingHours // 出勤日当日の午後以降に確認する用
  //   : workedHours - (workedDays - 1) * regularWorkingHours; // 出勤日当日の朝や休日などに確認する用
  // TODO: 平日に実働日数が増えるタイミングを確認して、不要ならば上記のコードと $ npm run start:holiday は消す
  return workedHours - workedDays * regularWorkingHours;
};

// 残業時間を出力用に整形する（e.g. 1.06666666666667 -> "1 時間 4 分"）
const format = (overtimeHours: number): string => {
  const hours = Math.floor(overtimeHours);
  const minutes = Math.floor((overtimeHours - hours) * 60);
  return `${hours} 時間 ${minutes} 分`;
};

// 残業時間を出力する
const print = (overtime: string) => {
  console.log("===============");
  console.log(overtime);
  console.log("===============");
};
