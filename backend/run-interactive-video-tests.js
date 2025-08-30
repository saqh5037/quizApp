#!/usr/bin/env node

/**
 * Test runner for Interactive Video features
 * Executes comprehensive tests including performance benchmarks
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE = 'http://localhost:3001/api/v1';
const TEST_VIDEO_ID = 58;

let authToken = '';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(name, passed, error = null) {
  if (passed) {
    console.log(chalk.green(`✅ ${name}`));
    results.passed++;
  } else {
    console.log(chalk.red(`❌ ${name}`));
    results.failed++;
    if (error) results.errors.push({ test: name, error: error.message });
  }
}

// Helper function to measure performance
async function measurePerformance(name, fn) {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(chalk.blue(`⏱️  ${name}: ${duration}ms`));
  return { result, duration };
}

// Test: Authentication
async function testAuthentication() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@aristotest.com',
      password: 'admin123'
    });
    
    authToken = response.data.data.accessToken;
    logTest('Authentication', true);
    return true;
  } catch (error) {
    logTest('Authentication', false, error);
    return false;
  }
}

// Test: Generate AI Content
async function testAIGeneration() {
  try {
    console.log(chalk.yellow('\n📝 Testing AI Content Generation...'));
    
    const { result, duration } = await measurePerformance(
      'AI Content Generation',
      async () => {
        const response = await axios.post(
          `${API_BASE}/interactive-video/generate/${TEST_VIDEO_ID}`,
          {},
          {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 300000 // 5 minute timeout
          }
        );
        return response.data;
      }
    );
    
    logTest('AI Content Generation', result.success);
    
    if (duration < 60000) {
      logTest('Generation completed in reasonable time', true);
    } else {
      logTest('Generation completed in reasonable time', false, 
        new Error(`Took ${duration}ms, expected < 60000ms`));
    }
    
    return result.data.layerId;
  } catch (error) {
    logTest('AI Content Generation', false, error);
    return null;
  }
}

// Test: Progress Tracking
async function testProgressTracking(layerId) {
  if (!layerId) return;
  
  console.log(chalk.yellow('\n📊 Testing Progress Tracking...'));
  
  const progressUpdates = [];
  let lastStatus = '';
  
  for (let i = 0; i < 15; i++) {
    try {
      const response = await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}/progress`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const { processingStatus, processingLog } = response.data.data;
      
      if (processingLog !== lastStatus) {
        const match = processingLog.match(/\((\d+)%\)/);
        if (match) {
          progressUpdates.push(parseInt(match[1]));
          console.log(chalk.gray(`  Progress: ${processingLog}`));
        }
        lastStatus = processingLog;
      }
      
      if (processingStatus === 'ready' || processingStatus === 'error') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logTest('Progress Tracking', false, error);
      return;
    }
  }
  
  // Verify gradual progress
  let gradual = true;
  for (let i = 1; i < progressUpdates.length; i++) {
    const jump = progressUpdates[i] - progressUpdates[i - 1];
    if (jump > 30) {
      gradual = false;
      break;
    }
  }
  
  logTest('Progress updates are gradual', gradual);
  logTest('Progress reaches 100%', progressUpdates[progressUpdates.length - 1] === 100);
}

// Test: Content Quality
async function testContentQuality(layerId) {
  if (!layerId) return;
  
  console.log(chalk.yellow('\n🎯 Testing Content Quality...'));
  
  try {
    const response = await axios.get(
      `${API_BASE}/interactive-video/layer/${layerId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const { aiGeneratedContent } = response.data.data;
    const contentStr = JSON.stringify(aiGeneratedContent);
    
    // Check for no mock data
    const hasMockData = 
      contentStr.includes('Lorem ipsum') ||
      contentStr.includes('Mock question') ||
      contentStr.includes('Ejemplo de transcripción');
    
    logTest('No mock data present', !hasMockData);
    
    // Check structure
    logTest('Has key moments', aiGeneratedContent.keyMoments?.length > 0);
    logTest('Has summary', !!aiGeneratedContent.summary);
    logTest('Has topics', aiGeneratedContent.topics?.length > 0);
    
    // Check timestamp distribution
    const moments = aiGeneratedContent.keyMoments || [];
    let wellDistributed = true;
    
    for (let i = 1; i < moments.length; i++) {
      const spacing = moments[i].timestamp - moments[i - 1].timestamp;
      if (spacing < 10) {
        wellDistributed = false;
        break;
      }
    }
    
    logTest('Timestamps well distributed', wellDistributed);
    
  } catch (error) {
    logTest('Content Quality Check', false, error);
  }
}

// Test: Content Editing
async function testContentEditing(layerId) {
  if (!layerId) return;
  
  console.log(chalk.yellow('\n✏️ Testing Content Editing...'));
  
  try {
    // Test transcription update
    const transcriptUpdate = await axios.patch(
      `${API_BASE}/interactive-video/layer/${layerId}/content`,
      {
        transcription: 'Updated transcription with corrected pronunciation'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logTest('Update transcription', transcriptUpdate.status === 200);
    
    // Test timestamp update
    const layerData = await axios.get(
      `${API_BASE}/interactive-video/layer/${layerId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const moments = layerData.data.data.aiGeneratedContent.keyMoments;
    if (moments && moments.length > 0) {
      moments[0].timestamp = 60;
      
      const timestampUpdate = await axios.patch(
        `${API_BASE}/interactive-video/layer/${layerId}/content`,
        {
          keyMoments: moments
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      logTest('Update timestamps', timestampUpdate.status === 200);
    }
    
  } catch (error) {
    logTest('Content Editing', false, error);
  }
}

// Test: Performance
async function testPerformance(layerId) {
  if (!layerId) return;
  
  console.log(chalk.yellow('\n⚡ Testing Performance...'));
  
  const times = [];
  
  for (let i = 0; i < 5; i++) {
    const startTime = Date.now();
    
    try {
      await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const endTime = Date.now();
      times.push(endTime - startTime);
    } catch (error) {
      logTest('Performance Test', false, error);
      return;
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  
  console.log(chalk.blue(`  Average response time: ${avgTime.toFixed(2)}ms`));
  console.log(chalk.blue(`  Max response time: ${maxTime}ms`));
  
  logTest('Average response < 200ms', avgTime < 200);
  logTest('Max response < 500ms', maxTime < 500);
}

// Main test runner
async function runTests() {
  console.log(chalk.bold.cyan('\n🚀 Interactive Video Feature Tests\n'));
  console.log(chalk.gray('Testing environment: ' + API_BASE));
  console.log(chalk.gray('Test video ID: ' + TEST_VIDEO_ID));
  console.log(chalk.gray('=' .repeat(50)));
  
  // Run authentication first
  const authSuccess = await testAuthentication();
  if (!authSuccess) {
    console.log(chalk.red('\n❌ Authentication failed. Cannot continue tests.'));
    process.exit(1);
  }
  
  // Run main tests
  const layerId = await testAIGeneration();
  
  if (layerId) {
    await testProgressTracking(layerId);
    await testContentQuality(layerId);
    await testContentEditing(layerId);
    await testPerformance(layerId);
  }
  
  // Print summary
  console.log(chalk.gray('\n' + '=' .repeat(50)));
  console.log(chalk.bold.cyan('\n📈 Test Summary\n'));
  console.log(chalk.green(`  Passed: ${results.passed}`));
  console.log(chalk.red(`  Failed: ${results.failed}`));
  
  if (results.errors.length > 0) {
    console.log(chalk.yellow('\n⚠️ Errors:'));
    results.errors.forEach(err => {
      console.log(chalk.red(`  - ${err.test}: ${err.error}`));
    });
  }
  
  const successRate = (results.passed / (results.passed + results.failed)) * 100;
  console.log(chalk.bold(`\n  Success Rate: ${successRate.toFixed(1)}%`));
  
  if (successRate === 100) {
    console.log(chalk.bold.green('\n✅ All tests passed successfully!\n'));
  } else {
    console.log(chalk.bold.yellow('\n⚠️ Some tests failed. Please review the errors above.\n'));
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Check if backend is running by trying to reach the auth endpoint
axios.get(`${API_BASE}/auth/check`)
  .then(() => {
    runTests();
  })
  .catch((error) => {
    // If we get a 401, the server is running but requires auth - that's fine
    if (error.response && error.response.status === 401) {
      runTests();
    } else {
      console.log(chalk.red('❌ Backend server is not running on ' + API_BASE));
      console.log(chalk.yellow('Please start the backend with: npm run dev'));
      process.exit(1);
    }
  });