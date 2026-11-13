import { getMemoryStats,getCPUStats,getNetworkStats } from "./services/metricsService.js";
import{getAllContainers,getContainerById,startContainer,stopContainer,restartContainer,getContainerLogs} from "./services/containerService.js";
import express from "express";
import cors from "cors";
import Docker from "dockerode";
const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());
const docker = new Docker({
  socketPath:  process.env.DOCKER_SOCKET ||"//./pipe/docker_engine"
});
app.get("/", (req, res) => {
  res.send("Container resource monitor API is running");
});
app.get("/api/docker/status", async (req, res) => {
  try {
    const info = await docker.info();
    res.json({
      connected: true,
      message: "Docker connected successfully",
      containers: info.Containers,
      running: info.ContainersRunning
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      message: "Unable to connect to Docker Engine"
    });
  }
});
app.get("/api/containers", async (req, res) => {
  try {
    const containers = await getAllContainers();
    res.json(containers);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Unable to fetch containers"
    });
  }
});
app.get("/api/containers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const container = await getContainerById(id);
    res.json(container);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Unable to fetch container details"
    });
  }
});
app.get("/api/containers/:id/stats", async (req, res) => {
  try {
    const id = req.params.id;
    const stats = await getMemoryStats(id);
    res.json(stats);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Unable to fetch container statistics"
    });
  }
});
app.get("/api/containers/:id/cpu", async (req, res) => {
  try {
    const id = req.params.id;

    const cpuStats = await getCPUStats(id);

    res.json(cpuStats);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Unable to fetch CPU statistics"
    });
  }
});
app.get("/api/containers/:id/network", async (req, res) => {
  try {
    const id = req.params.id;

    const networkStats = await getNetworkStats(id);

    res.json(networkStats);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Unable to fetch network statistics"
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
app.post("/api/containers/:id/start",async(req,res)=>{
    try{
        const id=req.params.id;
        const result=await startContainer(id);
        res.json(result);
        } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Unable to start container"
    });
  }
});
app.post("/api/containers/:id/stop", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await stopContainer(id);

    res.json(result);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Unable to stop container"
    });
  }
});
app.post("/api/containers/:id/restart", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await restartContainer(id);

    res.json(result);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Unable to restart container"
    });
  }
});
app.get("/api/containers/:id/logs", async (req, res) => {
  try {
    const logs = await getContainerLogs(req.params.id);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({
      message: "Unable to fetch container logs",
      error: error.message
    });
  }
});