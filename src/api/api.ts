// src/api/api.ts

import { execSync } from 'child_process';
import axios from 'axios';
import config from './config';

const getCurrentCommitHashAndTimeAndMessage = (): {
  hash: string | null;
  time: number | null;
  message: string | null;
} => {
  try {
    const output = execSync('git show -s --format="%H|%ct|%s" HEAD')
      .toString()
      .trim();
    const [hash, timestamp, message] = output.split('|');
    const localTimestamp = Number(timestamp);
    return {
      hash: hash.trim(),
      time: localTimestamp,
      message: message ? message.trim() : null,
    };
  } catch (err) {
    return { hash: null, time: null, message: null };
  }
};

const fetchLatestCommitHashListWithMessages = async (): Promise<
  { sha: string; timestamp: number; message: string }[] | null
> => {
  try {
    const response = await axios.get(
      'https://api.github.com/repos/AurLemon/fjcpc-transfer-exam-practice-system/commits',
    );
    return response.data.map((commit: any) => {
      const commitDate = new Date(commit.commit.author.date);
      const utcSeconds = Math.floor(commitDate.getTime() / 1000);
      return {
        sha: commit.sha,
        timestamp: utcSeconds,
        message: commit.commit.message.trim(),
      };
    });
  } catch (err) {
    return null;
  }
};

export const getCommitInfo = async () => {
  const {
    hash: localCommitHash,
    time: localCommitTime,
    message: localCommitMessage,
  } = getCurrentCommitHashAndTimeAndMessage();
  if (!localCommitHash) {
    return {
      local_commit: null,
      repo_commit: null,
      recent_commit: 'local',
      local_commit_time: null,
      repo_commit_time: null,
      local_commit_message: null,
      repo_commit_message: null,
    };
  }

  const repoCommitHashList = await fetchLatestCommitHashListWithMessages();
  if (!repoCommitHashList) {
    return {
      local_commit: localCommitHash,
      repo_commit: null,
      recent_commit: 'local',
      local_commit_time: localCommitTime,
      repo_commit_time: null,
      local_commit_message: localCommitMessage,
      repo_commit_message: null,
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
    local_commit_message: localCommitMessage || null,
    repo_commit_message: latestRepoCommit.message || null,
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
