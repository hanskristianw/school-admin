<?php
/**
 * Konfigurasi Integrasi Psikotes CCS ke Next.js API & Supabase
 * Yayasan Pendidikan Mayapada School (CCS)
 */

// Token rahasia otentikasi ke Next.js (manageccs.online)
define('API_SECRET_TOKEN', 'ccs_court_auth_2026_x7k9p2m4');
define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/psikotest');

/**
 * Helper cURL untuk komunikasi aman ke backend Next.js API
 */
function callNextJsApi($method = 'GET', $queryParams = [], $postData = null) {
    $url = NEXTJS_API_URL;
    if (!empty($queryParams)) {
        $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($queryParams);
    }

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . API_SECRET_TOKEN,
        'User-Agent: CCS-Psychotest-PHPClient/1.0'
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['success' => false, 'message' => 'Koneksi ke server sekolah gagal: ' . $error];
        }

        $json = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300) {
            return $json ?: ['success' => true];
        }
        return ['success' => false, 'message' => $json['message'] ?? "Error server (HTTP $httpCode)"];
    } else {
        // Fallback file_get_contents bila cURL dinonaktifkan
        $options = [
            'http' => [
                'header'        => implode("\r\n", $headers) . "\r\n",
                'method'        => $method,
                'timeout'       => 15,
                'ignore_errors' => true
            ]
        ];
        if ($method === 'POST') {
            $options['http']['content'] = json_encode($postData);
        }
        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            return ['success' => false, 'message' => 'Koneksi ke server gagal (stream error).'];
        }
        $json = json_decode($response, true);
        return $json ?: ['success' => true];
    }
}
