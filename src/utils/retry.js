export async function retry(fn, retries = 3, delay = 100) {
    try {
      return await fn();
    } catch (err) {
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, delay));
      return retry(fn, retries - 1, delay * 2);
    }
  }
  