const { execSync } = require('child_process');

function getCommitSha() {
  return execSync('git rev-parse HEAD').toString().trim();
}

function getWorkflowRun(sha) {
  try {
    const output = execSync('gh run list --limit 10 --json headSha,databaseId,status,conclusion').toString();
    const runs = JSON.parse(output);
    return runs.find(r => r.headSha.startsWith(sha) || sha.startsWith(r.headSha));
  } catch (e) {
    console.error('Failed to get workflow runs:', e.message);
    return null;
  }
}

async function watch() {
  const sha = getCommitSha();
  console.log(`Watching workflow for commit SHA: ${sha}`);
  
  const startTime = Date.now();
  const timeoutMs = 8 * 60 * 1000; // 8 minutes timeout
  
  while (Date.now() - startTime < timeoutMs) {
    const run = getWorkflowRun(sha);
    if (!run) {
      console.log('Workflow run not found yet. Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }
    
    console.log(`Workflow Run ID: ${run.databaseId}, Status: ${run.status}, Conclusion: ${run.conclusion}`);
    
    if (run.status === 'completed') {
      console.log(`[RESULT] ${run.conclusion}`);
      process.exit(run.conclusion === 'success' ? 0 : 1);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.error('Timeout waiting for workflow to complete.');
  process.exit(2);
}

watch();
