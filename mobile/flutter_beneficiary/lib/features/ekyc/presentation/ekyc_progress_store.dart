import 'package:flutter/material.dart';

import '../../../core/constants/colors.dart';

enum EkycStepStatus { pending, inProgress, done }

class EkycProgressStore {
  static final Map<String, EkycStepStatus> _status = {
    'ktp': EkycStepStatus.pending,
    'identity': EkycStepStatus.pending,
    'selfie': EkycStepStatus.pending,
    'liveness': EkycStepStatus.pending,
  };

  static EkycStepStatus statusOf(String id) =>
      _status[id] ?? EkycStepStatus.pending;

  static void setStatus(String id, EkycStepStatus status) {
    if (_status.containsKey(id)) {
      _status[id] = status;
    }
  }

  static Map<String, EkycStepStatus> snapshot() => Map.of(_status);

  static String labelFor(EkycStepStatus status) {
    switch (status) {
      case EkycStepStatus.done:
        return 'Berhasil';
      case EkycStepStatus.inProgress:
        return 'Sedang diproses...';
      case EkycStepStatus.pending:
      default:
        return 'Belum dimulai';
    }
  }

  static Color colorFor(EkycStepStatus status) {
    switch (status) {
      case EkycStepStatus.done:
        return AppColors.success;
      case EkycStepStatus.inProgress:
        return AppColors.accentOrange;
      case EkycStepStatus.pending:
      default:
        return AppColors.danger;
    }
  }
}
