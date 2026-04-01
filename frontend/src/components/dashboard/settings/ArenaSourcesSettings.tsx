import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/services/apiClient";
import { API_ENDPOINTS } from "@/config/api";
import { Toast } from "../../ui/Toast";
import { ErrorAlert } from "../../ui/ErrorAlert";

interface ArenaSource {
  id: number;
  name: string;
  host: string;
  port: number;
  client_id: string | null;
  client_secret: string | null;
  api_key: string | null;
  is_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface ArenaSourcesSettingsProps {
  isDarkMode: boolean;
}

export function ArenaSourcesSettings({
  isDarkMode,
}: ArenaSourcesSettingsProps) {
  const { t } = useTranslation();
  const [arenaSources, setArenaSources] = useState<ArenaSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<ArenaSource | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning";
    title: string;
    message?: string;
  }>({ show: false, variant: "success", title: "" });
  const [formData, setFormData] = useState({
    name: "",
    host: "host.docker.internal",
    port: 8080,
    client_id: "",
    client_secret: "",
    api_key: "",
  });

  useEffect(() => {
    loadArenaSources();
  }, []);

  const loadArenaSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<ArenaSource[]>(
        API_ENDPOINTS.ARENA_SOURCES,
      );
      setArenaSources(data);
    } catch (err) {
      console.error("Error loading arena sources:", err);
      setError(t("arenaSources.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingSource(null);
    setFormData({
      name: "",
      host: "host.docker.internal",
      port: 8080,
      client_id: "",
      client_secret: "",
      api_key: "",
    });
  };

  const handleLoadDefault = () => {
    setIsAddingNew(true);
    setEditingSource(null);
    setFormData({
      name: t("arenaSources.defaultName"),
      host: "host.docker.internal",
      port: 8080,
      client_id: "",
      client_secret: "",
      api_key: "",
    });
  };

  const handleEdit = (source: ArenaSource) => {
    setEditingSource(source);
    setIsAddingNew(false);
    setFormData({
      name: source.name,
      host: source.host,
      port: source.port,
      client_id: source.client_id || "",
      client_secret: source.client_secret || "",
      api_key: source.api_key || "",
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingSource(null);
    setFormData({
      name: "",
      host: "host.docker.internal",
      port: 8080,
      client_id: "",
      client_secret: "",
      api_key: "",
    });
  };

  const handleSave = async () => {
    try {
      if (editingSource) {
        // Update existing source
        await apiClient.put(
          `${API_ENDPOINTS.ARENA_SOURCES}/${editingSource.id}`,
          formData,
        );
      } else {
        // Create new source
        await apiClient.post(API_ENDPOINTS.ARENA_SOURCES, formData);
      }
      await loadArenaSources();
      handleCancel();
    } catch (err) {
      console.error("Error saving arena source:", err);
      setError(t("arenaSources.saveError"));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.ARENA_SOURCES}/${id}`);
      setPendingDeleteId(null);
      await loadArenaSources();
    } catch (err) {
      console.error("Error deleting arena source:", err);
      setError(t("arenaSources.deleteError"));
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await apiClient.post(`${API_ENDPOINTS.ARENA_SOURCES}/${id}/toggle`, {});
      await loadArenaSources();
    } catch (err) {
      console.error("Error toggling arena source:", err);
      setError(t("arenaSources.toggleError"));
    }
  };

  const handleTest = async (id: number) => {
    try {
      const result = await apiClient.post<{
        success: boolean;
        message: string;
        events_count?: number;
      }>(`${API_ENDPOINTS.ARENA_SOURCES}/${id}/test`, {});
      if (result.success) {
        setToast({
          show: true,
          variant: "success",
          title: t("arenaSources.testSuccess"),
          message: t("arenaSources.testEventsCount", { count: result.events_count }),
        });
      } else {
        setToast({
          show: true,
          variant: "error",
          title: t("arenaSources.testFailed"),
          message: result.message,
        });
      }
    } catch (err) {
      console.error("Error testing arena source:", err);
      setToast({
        show: true,
        variant: "error",
        title: t("arenaSources.testError"),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("arenaSources.never");
    return new Date(dateString).toLocaleString("sk-SK");
  };

  return (
    <div>
      <div
        className={`rounded-lg p-6 mb-6 ${isDarkMode ? "bg-gray-800" : "bg-white shadow"}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3
            className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            {t("arenaSources.title")}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleLoadDefault}
              disabled={isAddingNew || editingSource !== null}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("arenaSources.loadDefault")}
            </button>
            <button
              onClick={handleAddNew}
              disabled={isAddingNew || editingSource !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("arenaSources.addNew")}
            </button>
          </div>
        </div>

        <p
          className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
        >
          {t("arenaSources.description")}
        </p>

        {error && (
          <ErrorAlert message={error} isDarkMode={isDarkMode} className="mb-4" />
        )}

        {/* Add/Edit Form */}
        {(isAddingNew || editingSource) && (
          <div
            className={`p-4 rounded mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
          >
            <h4
              className={`font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              {editingSource
                ? t("arenaSources.editFormTitle")
                : t("arenaSources.addFormTitle")}
            </h4>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("arenaSources.nameLabel")}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("arenaSources.namePlaceholder")}
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? "bg-gray-600 border-gray-500 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("arenaSources.hostLabel")}
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) =>
                    setFormData({ ...formData, host: e.target.value })
                  }
                  placeholder="host.docker.internal"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? "bg-gray-600 border-gray-500 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("arenaSources.portLabel")}
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      port: parseInt(e.target.value) || 8080,
                    })
                  }
                  placeholder="8080"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? "bg-gray-600 border-gray-500 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("arenaSources.apiKeyLabel")}
                </label>
                <input
                  type="text"
                  value={formData.api_key}
                  onChange={(e) =>
                    setFormData({ ...formData, api_key: e.target.value })
                  }
                  placeholder="API key"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? "bg-gray-600 border-gray-500 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("arenaSources.clientIdLabel")}
                </label>
                <input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) =>
                    setFormData({ ...formData, client_id: e.target.value })
                  }
                  placeholder="OAuth client ID"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? "bg-gray-600 border-gray-500 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("arenaSources.clientSecretLabel")}
                </label>
                <input
                  type="text"
                  value={formData.client_secret}
                  onChange={(e) =>
                    setFormData({ ...formData, client_secret: e.target.value })
                  }
                  placeholder="OAuth client secret"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? "bg-gray-600 border-gray-500 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            <div
              className={`text-xs rounded p-3 mb-4 ${isDarkMode ? "bg-gray-600 text-gray-300" : "bg-blue-50 text-blue-800"}`}
            >
              <strong>{t("arenaSources.credentialsHint")}</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>
                  <strong>Client ID</strong> a <strong>Client Secret</strong>:
                  Settings → Apps → vyber aplikáciu → <em>App ID</em> = Client
                  ID, <em>Secret</em> = Client Secret
                </li>
                <li>
                  <strong>API Key</strong>: Settings → Users → vyber používateľa
                  → <em>API Key</em>
                </li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {t("arenaSources.save")}
              </button>
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded ${
                  isDarkMode
                    ? "bg-gray-600 hover:bg-gray-500"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {t("arenaSources.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Sources List */}
        {loading ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              {t("arenaSources.loading")}
            </div>
          </div>
        ) : arenaSources.length === 0 ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              {t("arenaSources.empty")}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {arenaSources.map((source) => (
              <div
                key={source.id}
                className={`p-4 rounded border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`font-semibold text-lg ${isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {source.name}
                      </span>
                      <span
                        className={`font-mono text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                      >
                        ({source.host}:{source.port})
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          source.is_enabled
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {source.is_enabled ? t("arenaSources.active") : t("arenaSources.inactive")}
                      </span>
                    </div>
                    <div
                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                    >
                      <div>
                        {t("arenaSources.lastSync")}{" "}
                        {formatDate(source.last_sync_at)}
                      </div>
                      {source.api_key && (
                        <div className="mt-1">
                          API Key: {source.api_key.substring(0, 20)}...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(source.id)}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                      title={t("arenaSources.testConnection")}
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleToggle(source.id)}
                      className={`px-3 py-1 text-sm rounded ${
                        source.is_enabled
                          ? "bg-yellow-600 text-white hover:bg-yellow-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {source.is_enabled ? t("arenaSources.deactivate") : t("arenaSources.activate")}
                    </button>
                    <button
                      onClick={() => handleEdit(source)}
                      disabled={isAddingNew || editingSource !== null}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {t("arenaSources.editButton")}
                    </button>
                    {pendingDeleteId === source.id ? (
                      <>
                        <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {t("arenaSources.confirmDelete")}
                        </span>
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          {t("common.yes")}
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(null)}
                          className={`px-3 py-1 text-sm rounded ${isDarkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                        >
                          {t("common.no")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setPendingDeleteId(source.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {t("arenaSources.deleteButton")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Toast
        show={toast.show}
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </div>
  );
}
