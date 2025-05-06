<?php  
$ip = $_SERVER['REMOTE_ADDR'];  
$referer = $_SERVER['HTTP_REFERER'] ?? 'прямой заход';  
$data = date('Y-m-d H:i:s') . " | IP: $ip | URL: " . $_SERVER['REQUEST_URI'] . " | Источник: $referer\n";  
file_put_contents('/var/log/secret_ips.log', $data, FILE_APPEND);  
?>  
