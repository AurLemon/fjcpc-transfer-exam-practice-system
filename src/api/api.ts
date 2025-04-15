import { execSync } from 'child_process';
import axios from 'axios';
import config from './config';

const getCurrentCommitHashAndTime = (): {
  hash: string | null;
  time: number | null;
} => {
  try {
    const output = execSync('git show -s --format="%H|%ct" HEAD')
      .toString()
      .trim();
    const [hash, timestamp] = output.split('|');
    const localTimestamp = Number(timestamp);
    return {
      hash: hash.trim(),
      time: localTimestamp,
    };
  } catch (err) {
    return { hash: null, time: null };
  }
};

const fetchLatestCommitHashList = async (): Promise<
  { sha: string; timestamp: number }[] | null
> => {
  try {
    const response = await axios.get(
      'https://api.github.com/repos/AurLemon/fjcpc-transfer-exam-practice-system/commits',
    );
    return response.data.map((commit: any) => {
      const commitDate = new Date(commit.commit.author.date);
      const utcSeconds = Math.floor(commitDate.getTime() / 1000);
      const localTimestamp = utcSeconds;
      return {
        sha: commit.sha,
        timestamp: localTimestamp,
      };
    });
  } catch (err) {
    return null;
  }
};

export const getCommitInfo = async () => {
  const { hash: localCommitHash, time: localCommitTime } =
    getCurrentCommitHashAndTime();
  if (!localCommitHash) {
    return {
      local_commit: null,
      repo_commit: null,
      recent_commit: 'local',
      local_commit_time: null,
      repo_commit_time: null,
    };
  }

  const repoCommitHashList = await fetchLatestCommitHashList();
  if (!repoCommitHashList) {
    return {
      local_commit: localCommitHash,
      repo_commit: null,
      recent_commit: 'local',
      local_commit_time: localCommitTime,
      repo_commit_time: null,
    };
  }

  const latestRepoCommit = repoCommitHashList[0];
  const repoCommitTime = latestRepoCommit.timestamp;

  let recentCommit: 'both' | 'repo' | 'local' = 'local';

  if (latestRepoCommit.sha === localCommitHash) {
    recentCommit = 'both';
  } else if (
    repoCommitHashList.some((commit) => commit.sha === localCommitHash)
  ) {
    recentCommit = 'repo';
  } else {
    recentCommit = 'local';
  }

  return {
    local_commit: localCommitHash,
    repo_commit: latestRepoCommit.sha,
    recent_commit: recentCommit,
    local_commit_time: localCommitTime,
    repo_commit_time: repoCommitTime,
  };
};

export const verifyIdNumber = async (id_number: string) => {
  try {
    const response = await axios.post(`${config.BASE_URL}/test32UserLogin`, {
      sfz: id_number,
    });

    return response.data;
  } catch (error) {
    throw new Error('身份证验证请求失败: ' + error.message);
  }
};

export const fetchExamQuestions = async (
  courseType: number,
  userId: string,
) => {
  try {
    const response = await axios.post(`${config.BASE_URL}/getTestSjTmInfo`, {
      lxlx: courseType,
      xsid: userId,
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch exam questions: ' + error.message);
  }
};
